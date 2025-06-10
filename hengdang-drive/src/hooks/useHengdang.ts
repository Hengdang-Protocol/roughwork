import { useState, useEffect } from "react";
import {
  createClient,
  type DirectoryEntry,
  type NostrEvent,
  type SessionInfo,
  AuthenticationError,
} from "@hengdang/client";

const client = createClient("http://localhost:3000");

// NIP-07 interface
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<NostrEvent>;
    };
  }
}

export const useHengdang = () => {
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check existing session on mount
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

  // Authenticate with Nostr extension (NIP-07)
  const authenticate = async () => {
    if (!window.nostr) {
      throw new Error(
        "Nostr extension not found. Please install a Nostr browser extension."
      );
    }

    try {
      const pubkey = await window.nostr.getPublicKey();

      // Create auth event
      const authEvent = {
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 27235, // NIP-27 auth event
        tags: [
          ["u", `${window.location.protocol}//${window.location.host}/session`],
          ["method", "POST"],
          ["scope", "read"],
          ["scope", "write"],
        ],
        content: JSON.stringify({
          app: "Hengdang Drive",
          description: "File storage access",
        }),
      };

      const signedEvent = await window.nostr.signEvent(authEvent);
      const response = await client.createSession(signedEvent);

      setIsAuthenticated(true);
      await checkAuth(); // Refresh session info
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Logout
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

  const loadDirectory = async (path: string) => {
    if (!isAuthenticated) {
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const listing = await client.listDirectory(path);
      setFiles(listing.entries);
      setCurrentPath(path);
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        setIsAuthenticated(false);
        setSessionInfo(null);
        setError("Session expired. Please login again.");
      } else {
        setError(err.message || "Failed to load directory");
      }
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (path: string, file: File) => {
    if (!isAuthenticated) throw new Error("Authentication required");

    const buffer = await file.arrayBuffer();
    await client.uploadFile(path, new Uint8Array(buffer));
    await loadDirectory(currentPath); // Refresh
  };

  const deleteFile = async (path: string) => {
    if (!isAuthenticated) throw new Error("Authentication required");

    await client.deleteFile(path);
    await loadDirectory(currentPath); // Refresh
  };

  const downloadFile = async (path: string) => {
    if (!isAuthenticated) throw new Error("Authentication required");

    const buffer = await client.downloadFile(path);
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() || "download";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load directory when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadDirectory("/");
    }
  }, [isAuthenticated, authLoading]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return {
    // File operations
    currentPath,
    files,
    loading,
    error,
    loadDirectory,
    uploadFile,
    deleteFile,
    downloadFile,

    // Authentication
    isAuthenticated,
    sessionInfo,
    authLoading,
    authenticate,
    logout,
    checkAuth,

    // Client
    client,
  };
};
