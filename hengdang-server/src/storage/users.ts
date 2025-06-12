import { storage } from './lmdb';

export interface User {
  pubkey: string;
  enabled: boolean;
  storageLimit: number; // bytes
  storageUsed: number;   // bytes
  createdAt: number;
  lastActive: number;
  displayName?: string;
  email?: string;
  notes?: string;
}

export interface UserStats {
  pubkey: string;
  fileCount: number;
  storageUsed: number;
  lastFileModified?: number;
  sessionCount: number;
}

export class UserStorage {
  
  /**
   * Create or update a user
   */
  async createUser(pubkey: string, options: {
    storageLimit?: number;
    displayName?: string;
    email?: string;
    notes?: string;
  } = {}): Promise<User> {
    const existingUser = await storage.users.get(pubkey);
    const now = Date.now();
    
    const user: User = {
      pubkey,
      enabled: true,
      storageLimit: options.storageLimit || (1024 * 1024 * 1024), // 1GB default
      storageUsed: existingUser?.storageUsed || 0,
      createdAt: existingUser?.createdAt || now,
      lastActive: existingUser?.lastActive || now,
      displayName: options.displayName || existingUser?.displayName,
      email: options.email || existingUser?.email,
      notes: options.notes || existingUser?.notes,
    };

    await storage.users.put(pubkey, user);
    return user;
  }

  /**
   * Get user by pubkey
   */
  async getUser(pubkey: string): Promise<User | null> {
    try {
      return await storage.users.get(pubkey) || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Check if user exists and is enabled
   */
  async isUserAllowed(pubkey: string): Promise<boolean> {
    const user = await this.getUser(pubkey);
    return user !== null && user.enabled;
  }

  /**
   * Update user's last active time
   */
  async updateLastActive(pubkey: string): Promise<void> {
    const user = await this.getUser(pubkey);
    if (user) {
      user.lastActive = Date.now();
      await storage.users.put(pubkey, user);
    }
  }

  /**
   * Update user's storage usage
   */
  async updateStorageUsage(pubkey: string, bytesChanged: number): Promise<void> {
    const user = await this.getUser(pubkey);
    if (user) {
      user.storageUsed = Math.max(0, user.storageUsed + bytesChanged);
      await storage.users.put(pubkey, user);
    }
  }

  /**
   * Check if user has enough storage space
   */
  async checkStorageLimit(pubkey: string, additionalBytes: number): Promise<boolean> {
    const user = await this.getUser(pubkey);
    if (!user) return false;
    
    return (user.storageUsed + additionalBytes) <= user.storageLimit;
  }

  /**
   * Enable/disable user
   */
  async setUserEnabled(pubkey: string, enabled: boolean): Promise<boolean> {
    const user = await this.getUser(pubkey);
    if (!user) return false;
    
    user.enabled = enabled;
    await storage.users.put(pubkey, user);
    return true;
  }

  /**
   * Update user storage limit
   */
  async setStorageLimit(pubkey: string, limitBytes: number): Promise<boolean> {
    const user = await this.getUser(pubkey);
    if (!user) return false;
    
    user.storageLimit = limitBytes;
    await storage.users.put(pubkey, user);
    return true;
  }

  /**
   * List all users with pagination
   */
  async listUsers(options: {
    limit?: number;
    cursor?: string;
    enabledOnly?: boolean;
  } = {}): Promise<{ users: User[]; nextCursor?: string; hasMore: boolean }> {
    const { limit = 50, cursor, enabledOnly = false } = options;
    const users: User[] = [];
    
    const range = storage.users.getRange({
      start: cursor,
      limit: limit + 1
    });

    for (const { key: pubkey, value: user } of range) {
      if (cursor && pubkey === cursor) continue;
      
      if (enabledOnly && !user.enabled) continue;
      
      users.push(user);
      
      if (users.length >= limit) break;
    }

    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    return {
      users,
      nextCursor: hasMore && users.length > 0 ? users[users.length - 1].pubkey : undefined,
      hasMore
    };
  }

  /**
   * Delete user and all their data
   */
  async deleteUser(pubkey: string): Promise<boolean> {
    const user = await this.getUser(pubkey);
    if (!user) return false;

    // Delete user record
    await storage.users.remove(pubkey);
    
    // Note: Actual file cleanup should be handled by the caller
    // This method just removes the user record
    return true;
  }

  /**
   * Get user statistics
   */
  async getUserStats(pubkey: string): Promise<UserStats | null> {
    const user = await this.getUser(pubkey);
    if (!user) return null;

    let fileCount = 0;
    let lastFileModified: number | undefined;
    
    // Count files for this user
    const range = storage.files.getRange({});
    for (const { key: path, value: metadata } of range) {
      if (metadata.owner === pubkey) {
        fileCount++;
        if (!lastFileModified || metadata.timestamp > lastFileModified) {
          lastFileModified = metadata.timestamp;
        }
      }
    }

    // Count active sessions
    let sessionCount = 0;
    const sessionRange = storage.sessions.getRange({});
    for (const { value: session } of sessionRange) {
      if (session.pubkey === pubkey && Date.now() <= session.expiresAt) {
        sessionCount++;
      }
    }

    return {
      pubkey,
      fileCount,
      storageUsed: user.storageUsed,
      lastFileModified,
      sessionCount
    };
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalStorage: number;
    totalFiles: number;
  }> {
    let totalUsers = 0;
    let activeUsers = 0;
    let totalStorage = 0;
    const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const range = storage.users.getRange({});
    for (const { value: user } of range) {
      totalUsers++;
      if (user.enabled && user.lastActive > last30Days) {
        activeUsers++;
      }
      totalStorage += user.storageUsed;
    }

    let totalFiles = 0;
    const fileRange = storage.files.getRange({});
    for (const {} of fileRange) {
      totalFiles++;
    }

    return {
      totalUsers,
      activeUsers,
      totalStorage,
      totalFiles
    };
  }
}

export const userStorage = new UserStorage();
