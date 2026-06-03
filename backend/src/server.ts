import dotenv from 'dotenv';
// Load env vars immediately before other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { createServer } from 'http';
import { connectDB } from './database/connectDB';
import { errorHandler } from './middlewares/error.middleware';
import { withClerkAuth } from './middlewares/clerk.middleware';
import { initializeSocket } from './socket';
import platformRoutes from './routes/platform.routes';
import webhookRoutes from './routes/webhook.routes';
import profileRoutes from './routes/profile.routes';
import projectRoutes from './routes/project.routes';
import socialRoutes from './routes/social.routes';
import contestRoutes from './routes/contest.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import progressRoutes from './routes/progress.routes';
import favoritesRoutes from './routes/favorites.routes';
import customSheetsRoutes from './routes/customSheets.routes';
import sheetsRoutes from './routes/sheets.routes';
import patternsRoutes from './routes/patterns.routes';
import problemsRoutes from './routes/problems.routes';
import activityRoutes from './routes/activity.routes';
import aggregationRoutes from './routes/aggregation.routes';
import swaggerRoutes from './config/swagger';
import universityRoutes from './routes/university.routes';
import suggestionRoutes from './routes/suggestion.routes';
import adminRoutes from './routes/admin.routes';
import { SystemSettings } from './models/settings.model';
import notificationRoutes from './routes/notification.routes';
import feedbackRoutes from './routes/feedback.routes';
import resumeRoutes from './routes/resume.routes';
import { startCronJobs } from './cron';
import { setupWorkers } from './queues/sync.worker';
import { setupCleanupWorker } from './queues/cleanup.worker';

const app = express();
// Trust the proxy (Render/Vercel) to get the real client IP for rate limiting
app.set('trust proxy', 1);

const httpServer = createServer(app);
const PORT = process.env.PORT || 5005;

// Initialize WebSockets
initializeSocket(httpServer);

// BullMQ Workers & Cron Jobs disabled locally (no local Redis)
// Enable in production with: setupWorkers(); setupCleanupWorker(); initCronJobs();

// Connect to Database
connectDB();

import { PlatformStats } from './models/platformStats.model';
import { UserActivity } from './models/UserActivity';
import { UserProgress } from './models/UserProgress';
import { MasterProblem } from './models/MasterProblem';



// Initialize UPSTASH/Mongo Cron Background Sync

if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Starting background cron jobs (Production Mode)');
  startCronJobs();
  
  // NOTE: BullMQ workers (setupWorkers, setupCleanupWorker) are disabled here 
  // because they require a raw Redis TCP connection (ioredis). 
  // Upstash REST API does not support BullMQ.
  // setupWorkers();
  // setupCleanupWorker();
} else {
  console.log('⏸️ Background workers disabled (Local Mode)');
}

// IMPORTANT: Webhook routes must come BEFORE generic express.json()
// because Svix requires the raw buffer to verify the signature.
app.use('/api/webhooks', webhookRoutes);

// Rate limiting configuration (500 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply rate limiter to all /api routes
app.use('/api', limiter);

// Middleware
app.use(express.json({ limit: '2mb' })); // Reduced from 15mb to prevent payload abuse
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));

// Data sanitization against NoSQL query injection
// Note: express-mongo-sanitize is removed because it is incompatible with Express 5 (req.query is read-only).
// Ensure Mongoose queries are properly typed to avoid NoSQL injection.

// Prevent HTTP parameter pollution
app.use(hpp());

// CORS setup for Frontend and Chrome Extension
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or extension background scripts)
    if (!origin) return callback(null, true);
    
    // Allow frontend localhost, production URLs, and chrome extensions
    if (
      origin.startsWith('http://localhost') || 
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('chrome-extension://') ||
      origin === process.env.FRONTEND_URL ||
      origin === process.env.ADMIN_URL ||
      origin === 'https://codeyx-web-admin.vercel.app'
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

// Basic Route (Health Check)
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Codeyx API is running successfully!' });
});

// Public System Settings (for Ads and styling config)
app.get('/api/settings', async (req, res) => {
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
    const publicSettings = {
      platformName: settings.platformName,
      siteDescription: settings.siteDescription,
      maintenanceMode: settings.maintenanceMode,
      adType: settings.adType || 'google',
      googleAdClient: settings.googleAdClient || 'ca-pub-2934790485812892',
      googleAdSlot: settings.googleAdSlot || '',
      googleAdSlotSidebar: settings.googleAdSlotSidebar || '',
      customAdImageUrl: settings.customAdImageUrl || '',
      customAdLinkUrl: settings.customAdLinkUrl || '',
      customAdTitle: settings.customAdTitle || '',
      customAdDescription: settings.customAdDescription || '',
    };
    return res.status(200).json({ success: true, data: publicSettings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public settings' });
  }
});

// Apply Clerk middleware globally for all subsequent routes (except webhooks which are handled above)
app.use(withClerkAuth);

// Define API Routes here
app.use('/api/platforms', platformRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/custom-sheets', customSheetsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/patterns', patternsRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', aggregationRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api', swaggerRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server using httpServer instead of app
httpServer.listen(PORT as number, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// Graceful Shutdown to instantly release port 5005 on Windows/Linux
const gracefulShutdown = (signal: string) => {
  console.log(`\nStopping server via ${signal}...`);
  httpServer.close(() => {
    console.log(`HTTP server closed. Port ${PORT} released.`);
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Trigger nodemon restart 13
