import { storage } from './lmdb';
import { Session } from '../types';
import { createHash } from 'crypto';

export class SessionStorage {
  
  /**
   * Generate a random session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString();
    const randomBytes = Buffer.from(Array.from({length: 16}, () => Math.floor(Math.random() * 256)));
    return createHash('sha256').update(timestamp + randomBytes.toString('hex')).digest('hex');
  }

  /**
   * Create a new session
   */
  async createSession(pubkey: string, permissions: string[], appName?: string): Promise<Session> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    const session: Session = {
      sessionId,
      pubkey,
      permissions,
      appName,
      createdAt: now,
      lastUsed: now,
      expiresAt
    };

    await storage.sessions.put(sessionId, session);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const session = await storage.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session last used time
   */
  async updateLastUsed(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.lastUsed = Date.now();
        await storage.sessions.put(sessionId, session);
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await storage.sessions.remove(sessionId);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * List all sessions for a pubkey
   */
  async getSessionsForPubkey(pubkey: string): Promise<Session[]> {
    try {
      const sessions: Session[] = [];
      const range = storage.sessions.getRange({});

      for (const { value: session } of range) {
        if (session.pubkey === pubkey && Date.now() <= session.expiresAt) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting sessions for pubkey:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      let cleanedCount = 0;
      const now = Date.now();
      const range = storage.sessions.getRange({});

      for (const { key: sessionId, value: session } of range) {
        if (now > session.expiresAt) {
          await storage.sessions.remove(sessionId);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return 0;
    }
  }

  /**
   * Revoke all sessions for a pubkey
   */
  async revokeAllSessionsForPubkey(pubkey: string): Promise<number> {
    try {
      let revokedCount = 0;
      const range = storage.sessions.getRange({});

      for (const { key: sessionId, value: session } of range) {
        if (session.pubkey === pubkey) {
          await storage.sessions.remove(sessionId);
          revokedCount++;
        }
      }

      return revokedCount;
    } catch (error) {
      console.error('Error revoking sessions:', error);
      return 0;
    }
  }
}

export const sessionStorage = new SessionStorage();
