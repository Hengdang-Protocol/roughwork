import { Request, Response, NextFunction } from 'express';
import { lockStorage } from '../storage/locks';

/**
 * Middleware to check and handle file locks for write operations
 */
export async function checkFileLock(req: Request, res: Response, next: NextFunction) {
  // Only check locks for PUT operations (writes)
  if (req.method !== 'PUT') {
    return next();
  }

  if (!req.session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const path = req.path;
  const sessionId = req.session.sessionId;

  try {
    // Check if file is locked
    const lockInfo = await lockStorage.isLocked(path, sessionId);
    
    if (lockInfo.locked) {
      return res.status(423).json({ // 423 Locked
        error: 'File is locked',
        message: 'This file is currently being edited by another session',
        lockedBy: lockInfo.lock?.lockedBy,
        lockedAt: lockInfo.lock?.lockedAt,
        expiresAt: lockInfo.lock?.expiresAt
      });
    }

    // Try to acquire lock for this write operation
    const lockAcquired = await lockStorage.acquireLock(path, sessionId);
    
    if (!lockAcquired) {
      return res.status(423).json({
        error: 'Could not acquire file lock',
        message: 'File became locked by another session'
      });
    }

    // Store lock info in request for cleanup later
    req.fileLockAcquired = { path, sessionId };
    
    next();
  } catch (error) {
    console.error('Lock check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to release file lock after write operation completes
 */
export async function releaseFileLock(req: Request, res: Response, next: NextFunction) {
  // Add cleanup logic after response is sent
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Call original send
    const result = originalSend.call(this, data);
    
    // Release lock after response is sent
    if (req.fileLockAcquired) {
      lockStorage.releaseLock(req.fileLockAcquired.path, req.fileLockAcquired.sessionId)
        .catch(error => console.error('Error releasing lock:', error));
    }
    
    return result;
  };

  next();
}

/**
 * Middleware to handle explicit lock/unlock requests
 */
export async function handleLockRequest(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const path = req.path;
  const sessionId = req.session.sessionId;
  const action = req.query.lock as string;

  try {
    if (action === 'acquire') {
      const success = await lockStorage.acquireLock(path, sessionId);
      if (success) {
        res.json({ message: 'Lock acquired', path, sessionId });
      } else {
        const lockInfo = await lockStorage.isLocked(path);
        res.status(423).json({
          error: 'File is locked',
          lockedBy: lockInfo.lock?.lockedBy,
          expiresAt: lockInfo.lock?.expiresAt
        });
      }
    } else if (action === 'release') {
      const success = await lockStorage.releaseLock(path, sessionId);
      if (success) {
        res.json({ message: 'Lock released', path });
      } else {
        res.status(404).json({ error: 'No lock found or not owned by this session' });
      }
    } else if (action === 'refresh') {
      const success = await lockStorage.refreshLock(path, sessionId);
      if (success) {
        res.json({ message: 'Lock refreshed', path });
      } else {
        res.status(404).json({ error: 'No lock found or not owned by this session' });
      }
    } else if (action === 'status') {
      const lockInfo = await lockStorage.isLocked(path, sessionId);
      res.json({
        locked: lockInfo.locked,
        lock: lockInfo.lock,
        ownedByThisSession: lockInfo.lock?.lockedBy === sessionId
      });
    } else {
      next(); // Not a lock request, continue to normal file handling
    }
  } catch (error) {
    console.error('Lock request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Extend Request interface to include lock info
declare global {
  namespace Express {
    interface Request {
      fileLockAcquired?: {
        path: string;
        sessionId: string;
      };
    }
  }
}
