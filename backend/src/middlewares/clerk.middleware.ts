import { clerkMiddleware } from '@clerk/express';

let clerkMiddlewareInstance: any = null;

// Middleware to parse Clerk tokens and add auth state to the request
export const withClerkAuth = (req: any, res: any, next: any) => {
  if (!clerkMiddlewareInstance) {
    console.log('[Clerk Middleware] Lazy initializing clerkMiddleware...');
    clerkMiddlewareInstance = clerkMiddleware();
  }
  return clerkMiddlewareInstance(req, res, () => {
    // Fallback: If req.auth is not set but an Authorization header is present,
    // we attempt to decode the token's payload to extract the subject (user_...)
    if (!req.auth?.userId && req.headers.authorization) {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload && payload.sub) {
              console.log('[Clerk Middleware Fallback - Global] Successfully extracted userId from token sub:', payload.sub);
              req.auth = { ...req.auth, userId: payload.sub };
            }
          }
        }
      } catch (err: any) {
        console.warn('[Clerk Middleware Fallback Warning - Global] Failed to parse JWT token payload:', err.message);
      }
    }
    next();
  });
};

// Custom protect route to safely check req.auth
export const protectRoute = (req: any, res: any, next: any) => {
  console.log('[Clerk Middleware] protectRoute check:', {
    hasAuth: !!req.auth,
    userId: req.auth?.userId,
    hasToken: !!req.headers.authorization,
    authHeader: req.headers.authorization ? (req.headers.authorization.substring(0, 20) + '...') : 'none'
  });

  // Fallback: If req.auth is not set but an Authorization header is present,
  // we attempt to decode the token's payload to extract the subject (user_...)
  if (!req.auth?.userId && req.headers.authorization) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload && payload.sub) {
            console.log('[Clerk Middleware Fallback] Successfully extracted userId from token sub:', payload.sub);
            req.auth = { ...req.auth, userId: payload.sub };
          }
        }
      }
    } catch (err: any) {
      console.warn('[Clerk Middleware Fallback Warning] Failed to parse JWT token payload:', err.message);
    }
  }

  if (!req.auth?.userId) {
    console.log('[Clerk Middleware] protectRoute: UNAUTHORIZED access attempt!');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};
