import { Request, Response } from 'express';
import { clerkClient } from '@clerk/express';
import { SystemSettings } from '../models/settings.model';
import { sendSystemNotificationEmail } from '../services/mail.service';
import { addCleanupJob } from '../queues/cleanup.queue';
import { addSyncJob } from '../queues/sync.queue';
import { emitToUser, getSocketIo } from '../socket';
import { redisClient } from '../config/redis.config';
import { User } from '../models/user.model';
import { PlatformStats } from '../models/platformStats.model';
import { ApiResponse } from '../utils/ApiResponse';
import { Notification } from '../models/notification.model';
// ⚠️ ADMIN WHITELIST — Only this email can access admin APIs
const ADMIN_EMAIL_WHITELIST = ['lalitkumargeloth16@gmail.com'];

const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) return false;

    // Double security: email must be in whitelist AND role must be 'admin'
    const isWhitelisted = ADMIN_EMAIL_WHITELIST.includes(user.email?.toLowerCase());
    if (!isWhitelisted) return false;

    // Auto-set role to admin if whitelisted (one-time self-healing)
    if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    return true;
  } catch {
    return false;
  }
};

export const deleteUserFromClerk = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).auth?.userId;
    const { targetUserId } = req.body;

    // Security Check
    if (!adminId || !(await isAdmin(adminId))) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    // Reverse Sync: 1. Delete from Clerk (this will trigger the webhook automatically!)
    await clerkClient.users.deleteUser(targetUserId);

    // 2. Disconnect Sockets immediately
    emitToUser(targetUserId, 'SESSION_REVOKED', { reason: 'Account deleted by admin' });

    return res.status(200).json(new ApiResponse(200, {}, `User ${targetUserId} deleted across all systems.`));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const banUser = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).auth?.userId;
    const { targetUserId } = req.body;

    if (!adminId || !(await isAdmin(adminId))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // @ts-ignore - Clerk SDK types might not have banUser depending on version, but it's a valid method
    await clerkClient.users.banUser(targetUserId);
    emitToUser(targetUserId, 'SESSION_REVOKED', { reason: 'Account banned by admin' });
    getSocketIo().emit('admin.activity', { action: 'ban', targetUserId });

    return res.status(200).json(new ApiResponse(200, {}, 'User banned successfully'));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).auth?.userId;
    const { targetUserId, targetUserIds, title, message, type, broadcast } = req.body;

    if (!adminId || !(await isAdmin(adminId))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let userIds = targetUserIds || (targetUserId ? [targetUserId] : []);
    
    if (broadcast) {
      const allUsers = await User.find({}, { clerkUserId: 1 });
      userIds = allUsers.map(u => u.clerkUserId).filter(Boolean);
    }
    
    if (userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No target users specified' });
    }

    const notifications = await Promise.all(
      userIds.map(async (uid: string) => {
        const notification = await Notification.create({
          userId: uid,
          title,
          message,
          type: type || 'info'
        });
        emitToUser(uid, 'NEW_NOTIFICATION', notification);
        return notification;
      })
    );

    // Send emails
    try {
      const targetUsers = await User.find({ clerkUserId: { $in: userIds } }, { email: 1 });
      const emails = targetUsers.map(u => u.email).filter(Boolean);
      if (emails.length > 0) {
        // Send email without awaiting, to not block the response
        sendSystemNotificationEmail(emails, title, message, type).catch(console.error);
      }
    } catch (emailErr) {
      console.error('Error fetching emails for notification:', emailErr);
    }

    return res.status(200).json(new ApiResponse(200, { count: notifications.length }, `Notification sent to ${notifications.length} users`));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    } else {
      // Self-healing migration for old placeholder values in database
      let updated = false;
      if (settings.googleAdClient === 'ca-pub-YOUR_PUBLISHER_ID') {
        settings.googleAdClient = 'ca-pub-2934790485812892';
        updated = true;
      }
      if (settings.googleAdSlot === 'YOUR_DEFAULT_SLOT_ID') {
        settings.googleAdSlot = '';
        updated = true;
      }
      if (settings.googleAdSlotSidebar === 'YOUR_DEFAULT_SLOT_ID') {
        settings.googleAdSlotSidebar = '';
        updated = true;
      }
      if (updated) {
        await settings.save();
      }
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).auth?.userId;
    if (!adminId || !(await isAdmin(adminId))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updateData = req.body;
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = await SystemSettings.create(updateData);
    } else {
      settings = await SystemSettings.findOneAndUpdate({}, updateData, { new: true });
    }

    return res.status(200).json({ success: true, data: settings, message: 'Settings saved successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

// ─── POST /admin/force-sync ──────────────────────────────────────────────────
export const forceSyncAll = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).auth?.userId;
    if (!adminId || !(await isAdmin(adminId))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const allStats = await PlatformStats.find({}, { userId: 1, platform: 1, username: 1 }).lean();
    if (allStats.length === 0) {
      return res.status(200).json({ success: true, message: 'No connected platforms found', queued: 0 });
    }

    let queuedCount = 0;
    const staggerDelayMs = 5000; // Stagger each task by 5 seconds
    const errors: string[] = [];

    for (const stat of allStats) {
      try {
        if (stat.username) {
          const currentDelay = queuedCount * staggerDelayMs;
          await addSyncJob(stat.userId.toString(), stat.platform, stat.username, currentDelay);
          queuedCount++;
        }
      } catch (e: any) {
        errors.push(`${stat.platform}:${stat.username} - ${e.message}`);
      }
    }

    console.log(`[Admin Force Sync] ✅ Queued ${queuedCount} sync jobs by admin ${adminId}`);
    return res.status(200).json({
      success: true,
      message: `Force sync started! ${queuedCount} platform syncs queued.`,
      queued: queuedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Admin Force Sync] ❌ Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to start force sync' });
  }
};

// ─── GET /admin/sync-list ─────────────────────────────────────────────────────
// Returns all connected platform entries for the sequential sync UI
export const getSyncList = async (req: Request, res: Response) => {
  try {
    const allStats = await PlatformStats.find({}, { userId: 1, platform: 1, username: 1 }).lean();

    // Fetch user display names
    const userIds = [...new Set(allStats.map((s: any) => s.userId))];
    const users = await User.find({ clerkUserId: { $in: userIds } }, { clerkUserId: 1, firstName: 1, lastName: 1, email: 1 }).lean();
    const userMap: Record<string, any> = {};
    users.forEach((u: any) => { userMap[u.clerkUserId] = u; });

    const data = allStats
      .filter((s: any) => s.username)
      .map((s: any) => {
        const u = userMap[s.userId];
        const displayName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email?.split('@')[0] : s.userId.slice(-6);
        return {
          userId: s.userId,
          platform: s.platform,
          username: s.username,
          displayName,
        };
      });

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sync list' });
  }
};

// ─── POST /admin/sync-one ─────────────────────────────────────────────────────
// Syncs a single user's platform immediately (queued via BullMQ)
export const syncOne = async (req: Request, res: Response) => {
  try {
    const { userId, platform, username } = req.body;

    if (!userId || !platform || !username) {
      return res.status(400).json({ success: false, message: 'userId, platform, username required' });
    }

    await addSyncJob(userId, platform, username);

    console.log(`[Admin Sync One] ✅ Queued: ${platform}:${username} for user ${userId}`);
    return res.status(200).json({
      success: true,
      message: `Queued sync for ${platform}:${username}`,
    });
  } catch (error: any) {
    console.error('[Admin Sync One] ❌ Error:', error.message);
    return res.status(500).json({ success: false, message: `Sync failed: ${error.message}` });
  }
};
