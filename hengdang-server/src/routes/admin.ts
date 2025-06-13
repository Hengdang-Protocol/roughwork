import { Router, Request, Response } from 'express';
import { userStorage } from '../storage/users';
import { sessionStorage } from '../storage/sessions';
import { fileStorage } from '../storage/files';
import { directoryStorage } from '../storage/directories';
import { lockStorage } from '../storage/locks';
import { storage } from '../storage/lmdb';

const router = Router();

// Admin authentication middleware
function requireAdmin(req: Request, res: Response, next: any) {
  const adminKey = req.headers['x-admin-key'] as string;
  const expectedKey = process.env.ADMIN_KEY;
  
  if (!expectedKey) {
    return res.status(500).json({
      error: 'Admin not configured',
      message: 'ADMIN_KEY environment variable not set'
    });
  }
  
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin key'
    });
  }
  
  next();
}

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * GET /admin/users - List all users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const cursor = req.query.cursor as string;
    const enabledOnly = req.query.enabled === 'true';
    
    const result = await userStorage.listUsers({ limit, cursor, enabledOnly });
    
    res.json(result);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /admin/users - Create/whitelist a new user
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { pubkey, storageLimit, displayName, email, notes } = req.body;
    
    if (!pubkey || typeof pubkey !== 'string' || pubkey.length !== 64) {
      return res.status(400).json({
        error: 'Invalid pubkey',
        message: 'pubkey must be a 64-character hex string'
      });
    }
    
    const storageLimitBytes = storageLimit ? parseInt(storageLimit) : undefined;
    if (storageLimitBytes && (storageLimitBytes < 0 || storageLimitBytes > 1024 * 1024 * 1024 * 1024)) {
      return res.status(400).json({
        error: 'Invalid storage limit',
        message: 'Storage limit must be between 0 and 1TB'
      });
    }
    
    const user = await userStorage.createUser(pubkey, {
      storageLimit: storageLimitBytes,
      displayName,
      email,
      notes
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/users/:pubkey - Get user details
 */
router.get('/users/:pubkey', async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    
    const user = await userStorage.getUser(pubkey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const stats = await userStorage.getUserStats(pubkey);
    
    res.json({ user, stats });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /admin/users/:pubkey - Update user
 */
router.put('/users/:pubkey', async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { enabled, storageLimit, displayName, email, notes } = req.body;
    
    const user = await userStorage.getUser(pubkey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update enabled status
    if (typeof enabled === 'boolean') {
      await userStorage.setUserEnabled(pubkey, enabled);
    }
    
    // Update storage limit
    if (storageLimit !== undefined) {
      const limitBytes = parseInt(storageLimit);
      if (limitBytes < 0 || limitBytes > 1024 * 1024 * 1024 * 1024) {
        return res.status(400).json({
          error: 'Invalid storage limit',
          message: 'Storage limit must be between 0 and 1TB'
        });
      }
      await userStorage.setStorageLimit(pubkey, limitBytes);
    }
    
    // Update other fields
    const updatedUser = await userStorage.createUser(pubkey, {
      storageLimit: storageLimit ? parseInt(storageLimit) : undefined,
      displayName,
      email,
      notes
    });
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /admin/users/:pubkey - Delete user and all their data
 */
router.delete('/users/:pubkey', async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    
    const user = await userStorage.getUser(pubkey);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete all user sessions
    const sessions = await sessionStorage.getSessionsForPubkey(pubkey);
    for (const session of sessions) {
      await sessionStorage.deleteSession(session.sessionId);
    }
    
    // Release all locks for user sessions
    const sessionIds = sessions.map(s => s.sessionId);
    for (const sessionId of sessionIds) {
      await lockStorage.releaseAllLocksForSession(sessionId);
    }
    
    // Delete all user files
    const fileRange = storage.files.getRange({});
    const filesToDelete: string[] = [];
    for (const { key: path, value: metadata } of fileRange) {
      if (metadata.owner === pubkey) {
        filesToDelete.push(path);
      }
    }
    
    for (const path of filesToDelete) {
      await fileStorage.deleteFile(path);
    }
    
    // Delete all user directories
    const directoryRange = storage.directories.getRange({});
    const directoriesToDelete: string[] = [];
    for (const { key: path, value: metadata } of directoryRange) {
      if (metadata.owner === pubkey) {
        directoriesToDelete.push(path);
      }
    }
    
    // Sort directories by depth (deepest first) to delete safely
    directoriesToDelete.sort((a, b) => b.split('/').length - a.split('/').length);
    
    for (const path of directoriesToDelete) {
      await directoryStorage.deleteDirectory(path, pubkey);
    }
    
    // Delete user record
    await userStorage.deleteUser(pubkey);
    
    res.status(204).end();
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/stats - Get system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const systemStats = await userStorage.getSystemStats();
    
    // Additional stats
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    // Count recent events
    let recentEvents = 0;
    const eventRange = storage.events.getRange({
      start: last24h.toString(),
      end: now.toString()
    });
    for (const {} of eventRange) {
      recentEvents++;
    }
    
    // Count active sessions
    let activeSessions = 0;
    const sessionRange = storage.sessions.getRange({});
    for (const { value: session } of sessionRange) {
      if (now <= session.expiresAt) {
        activeSessions++;
      }
    }
    
    // Count directories
    let totalDirectories = 0;
    const dirRange = storage.directories.getRange({});
    for (const {} of dirRange) {
      totalDirectories++;
    }
    
    res.json({
      ...systemStats,
      recentEvents,
      activeSessions,
      totalDirectories,
      timestamp: now
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/sessions - List all active sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions: any[] = [];
    const now = Date.now();
    
    const range = storage.sessions.getRange({});
    for (const { value: session } of range) {
      if (now <= session.expiresAt) {
        sessions.push({
          sessionId: session.sessionId,
          pubkey: session.pubkey,
          appName: session.appName,
          permissions: session.permissions,
          createdAt: session.createdAt,
          lastUsed: session.lastUsed,
          expiresAt: session.expiresAt
        });
      }
    }
    
    res.json({ sessions });
  } catch (error) {
    console.error('Admin sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /admin/sessions/:sessionId - Revoke a session
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const deleted = await sessionStorage.deleteSession(sessionId);
    
    if (deleted) {
      // Also release any locks held by this session
      await lockStorage.releaseAllLocksForSession(sessionId);
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Admin revoke session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/locks - List all active file locks
 */
router.get('/locks', async (req: Request, res: Response) => {
  try {
    const locks = await lockStorage.getAllLocks();
    res.json({ locks });
  } catch (error) {
    console.error('Admin locks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /admin/locks/:path - Force release a file lock
 */
router.delete('/locks/*', async (req: Request, res: Response) => {
  try {
    const path = req.path.replace('/admin/locks', '');
    
    const released = await lockStorage.releaseLock(path);
    
    if (released) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Lock not found' });
    }
  } catch (error) {
    console.error('Admin release lock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /admin/cleanup - Run cleanup tasks
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const expiredSessions = await sessionStorage.cleanupExpiredSessions();
    const expiredLocks = await lockStorage.cleanupExpiredLocks();
    
    res.json({
      message: 'Cleanup completed',
      expiredSessions,
      expiredLocks
    });
  } catch (error) {
    console.error('Admin cleanup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
