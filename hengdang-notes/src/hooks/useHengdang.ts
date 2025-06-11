import { useState, useEffect, useCallback } from "react";
import {
  createClient,
  type DirectoryEntry,
  type NostrEvent,
  type SessionInfo,
  AuthenticationError,
  type FileChangeEvent,
} from "@hengdang/client";

const client = createClient("http://localhost:3000");

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<NostrEvent>;
    };
  }
}

export const useHengdang = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    setAuthLoading(true);
    try {
      const info = await client.getSessionInfo();
      setSessionInfo(info);
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      setSessionInfo(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const authenticate = async () => {
    if (!window.nostr) {
      throw new Error(
        "Nostr extension not found. Please install a Nostr browser extension."
      );
    }

    try {
      const pubkey = await window.nostr.getPublicKey();

      const authEvent = {
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 27235,
        tags: [
          ["u", `http://localhost:3000/auth/session`],
          ["method", "POST"],
          ["scope", "read"],
          ["scope", "write"],
        ],
        content: JSON.stringify({
          app: "Hengdang Notes",
          description: "Personal knowledge management",
        }),
      };

      const signedEvent = await window.nostr.signEvent(authEvent);
      await client.createSession(signedEvent);

      setIsAuthenticated(true);
      await checkAuth();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await client.deleteSession();
    } catch (error) {
      // Ignore errors on logout
    } finally {
      setIsAuthenticated(false);
      setSessionInfo(null);
      client.clearSession();
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    sessionInfo,
    authLoading,
    authenticate,
    logout,
    checkAuth,
    error,
    client,
  };
};
