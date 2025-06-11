import { storage } from './lmdb';

export interface FileLock {
  path: string;
  lockedBy: string;    // sessionId
  lockedAt: number;    // timestamp
  expiresAt: number;   // auto-expire after 30 minutes
}

export class LockStorage {
  
  /**
   * Acquire a lock on a file
   */
  async acquireLock(path: string, sessionId: string): Promise<boolean> {
    const existingLock = await storage.locks.get(path);
    
    // Check if file is already locked by someone else
    if (existingLock) {
      // Check if lock expired
      if (Date.now() > existingLock.expiresAt) {
        await this.releaseLock(path);
      } else if (existingLock.lockedBy !== sessionId) {
        return false; // Already locked by someone else
      }
    }

    // Create or refresh lock
    const lock: FileLock = {
      path,
      lockedBy: sessionId,
      lockedAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    };

    await storage.locks.put(path, lock);
    return true;
  }

  /**
   * Release a lock on a file
   */
  async releaseLock(path: string, sessionId?: string): Promise<boolean> {
    const existingLock = await storage.locks.get(path);
    
    if (!existingLock) {
      return false; // No lock to release
    }

    // If sessionId provided, check ownership
    if (sessionId && existingLock.lockedBy !== sessionId) {
      return false; // Can't release someone else's lock
    }

    await storage.locks.remove(path);
    return true;
  }

  /**
   * Check if a file is locked
   */
  async isLocked(path: string, sessionId?: string): Promise<{ locked: boolean; lock?: FileLock }> {
    const lock = await storage.locks.get(path);
    
    if (!lock) {
      return { locked: false };
    }

    // Check if lock expired
    if (Date.now() > lock.expiresAt) {
      await this.releaseLock(path);
      return { locked: false };
    }

    // If sessionId provided, check if it's locked by this session
    if (sessionId && lock.lockedBy === sessionId) {
      return { locked: false, lock }; // Not locked for this session
    }

    return { locked: true, lock };
  }

  /**
   * Refresh a lock (extend expiry time)
   */
  async refreshLock(path: string, sessionId: string): Promise<boolean> {
    const existingLock = await storage.locks.get(path);
    
    if (!existingLock || existingLock.lockedBy !== sessionId) {
      return false;
    }

    existingLock.expiresAt = Date.now() + (30 * 60 * 1000); // Extend by 30 minutes
    await storage.locks.put(path, existingLock);
    return true;
  }

  /**
   * Release all locks for a session (when user logs out)
   */
  async releaseAllLocksForSession(sessionId: string): Promise<number> {
    let releasedCount = 0;
    const range = storage.locks.getRange({});

    for (const { key: path, value: lock } of range) {
      if (lock.lockedBy === sessionId) {
        await storage.locks.remove(path);
        releasedCount++;
      }
    }

    return releasedCount;
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();
    const range = storage.locks.getRange({});

    for (const { key: path, value: lock } of range) {
      if (now > lock.expiresAt) {
        await storage.locks.remove(path);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get all active locks (for debugging)
   */
  async getAllLocks(): Promise<FileLock[]> {
    const locks: FileLock[] = [];
    const range = storage.locks.getRange({});

    for (const { value: lock } of range) {
      // Only return non-expired locks
      if (Date.now() <= lock.expiresAt) {
        locks.push(lock);
      }
    }

    return locks;
  }
}

export const lockStorage = new LockStorage();
