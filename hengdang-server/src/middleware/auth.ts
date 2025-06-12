import { Request, Response, NextFunction } from 'express';
import { sessionStorage } from '../storage/sessions';
import { userStorage } from '../storage/users';
import { Session } from '../types';

// Extend Request interface to include session
declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

/**
 * Middleware to authenticate requests using session
 */
export async function authenticateSession(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract session ID from cookie or Authorization header
    const sessionId = req.cookies.hengdang_session || 
                     req.headers.authorization?.replace('Bearer ', '');

    if (!sessionId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No session cookie or authorization header found'
      });
    }

    // Get session from storage
    const session = await sessionStorage.getSession(sessionId);
    if (!session) {
      return res.status(401).json({
        error: 'Invalid session',
        message: 'Session not found or expired'
      });
    }

    // Check if user is still allowed
    const userAllowed = await userStorage.isUserAllowed(session.pubkey);
    if (!userAllowed) {
      return res.status(403).json({
        error: 'User disabled',
        message: 'User account has been disabled by administrator'
      });
    }

    // Update last used time and user last active
    await sessionStorage.updateLastUsed(sessionId);
    await userStorage.updateLastActive(session.pubkey);

    // Attach session to request
    req.session = session;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware to check if user has required permissions
 */
export function requirePermissions(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No session found'
      });
    }

    // Check if user has all required permissions
    const hasPermissions = requiredPermissions.every(permission => 
      req.session!.permissions.includes(permission) || 
      req.session!.permissions.includes('admin')
    );

    if (!hasPermissions) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permissions: ${requiredPermissions.join(', ')}`,
        userPermissions: req.session.permissions
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware - adds session if present but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies.hengdang_session || 
                     req.headers.authorization?.replace('Bearer ', '');

    if (sessionId) {
      const session = await sessionStorage.getSession(sessionId);
      if (session) {
        // Check if user is still allowed
        const userAllowed = await userStorage.isUserAllowed(session.pubkey);
        if (userAllowed) {
          await sessionStorage.updateLastUsed(sessionId);
          await userStorage.updateLastActive(session.pubkey);
          req.session = session;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Don't fail the request, just continue without session
    next();
  }
}
