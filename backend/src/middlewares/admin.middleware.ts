import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { clerkClient } from '@clerk/express';

// ⚠️  HARDCODED ADMIN WHITELIST — Only these emails can access admin APIs
const ADMIN_WHITELIST = ['lalitkumargeloth16@gmail.com'];

/**
 * requireAdmin — Double-check middleware for admin routes
 * Check 1: Valid Clerk token with userId (set by protectRoute)
 * Check 2: Email must be in ADMIN_WHITELIST
 * Check 3: DB role must be 'admin'
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).auth?.userId;

    // Check 1: Must have a valid authenticated userId
    if (!userId) {
      console.warn('[AdminGuard] ❌ No userId in request — Unauthorized');
      return res.status(401).json({ success: false, message: 'Unauthorized: No valid session' });
    }

    // Check 2: Lookup user in DB
    let user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      console.warn(`[AdminGuard] 🛡️ User ${userId} not found in DB. Attempting to fetch from Clerk...`);
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        const emailNormalized = email?.toLowerCase()?.trim();

        if (emailNormalized && ADMIN_WHITELIST.includes(emailNormalized)) {
          console.log(`[AdminGuard] 🌟 Whitelisted user ${emailNormalized} found on Clerk. Auto-syncing/creating in local DB...`);
          user = await User.create({
            clerkUserId: userId,
            email: emailNormalized,
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            username: clerkUser.username || undefined,
            avatarUrl: clerkUser.imageUrl || '',
            role: 'admin',
          });
        }
      } catch (clerkErr: any) {
        console.error(`[AdminGuard] ❌ Failed to fetch user from Clerk:`, clerkErr.message);
      }
    }

    if (!user) {
      console.warn(`[AdminGuard] ❌ User ${userId} not found in DB and could not be auto-created`);
      return res.status(403).json({ success: false, message: `Forbidden: User with Clerk ID ${userId} not found in DB` });
    }

    // Check 3: Email must be in the admin whitelist
    const emailNormalized = user.email?.toLowerCase()?.trim();
    if (!ADMIN_WHITELIST.includes(emailNormalized)) {
      console.warn(`[AdminGuard] ❌ Email "${emailNormalized}" is NOT in admin whitelist`);
      return res.status(403).json({ success: false, message: `Forbidden: Email "${emailNormalized}" is not in admin whitelist` });
    }

    // Check 4: DB role must be 'admin' (auto-fix if whitelisted)
    if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
      console.log(`[AdminGuard] ✅ Auto-promoted ${emailNormalized} to admin role`);
    }

    console.log(`[AdminGuard] ✅ Admin access granted to: ${emailNormalized}`);
    next();
  } catch (err: any) {
    console.error('[AdminGuard] ❌ Error in admin middleware:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during admin check' });
  }
};
