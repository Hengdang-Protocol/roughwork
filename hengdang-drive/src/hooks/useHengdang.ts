import { useState, useEffect, useCallback, useRef } from "react";
import {
  createClient,
  type DirectoryEntry,
  type NostrEvent,
  type SessionInfo,
  AuthenticationError,
  FileLockError,
  type FileChangeEvent,
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

export interface UploadProgress {
  fileName: string;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface FileState {
  path: string;
  isLocked: boolean;
  lockedBy?: string;
  isPreviewOpen: boolean;
}

export const useHengdang = () => {
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [fileStates, setFileStates] = useState<Map<string, FileState>>(new Map());
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // SSE connection ref
  const sseCleanupRef = useRef<(() => void) | null>(null);

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

  // Setup SSE connection for real-time updates
  const setupSSE = useCallback(() => {
    if (!isAuthenticated || !sessionInfo || sseCleanupRef.current) return;

    try {
      const cleanup = client.onFileChange(
        (event: FileChangeEvent) => {
          console.log("File change event:", event);

          // Refresh current directory if the changed file is in it
          if (event.path.startsWith(currentPath) || currentPath === "/") {
            loadDirectory(currentPath, false); // Refresh without loading state
          }

          // Update file states
          setFileStates((prev) => {
            const newStates = new Map(prev);
            if (event.operation === "DELETE") {
              newStates.delete(event.path);
            }
            return newStates;
          });
        },
        currentPath === "/" ? undefined : `${currentPath}/*`
      );

      sseCleanupRef.current = cleanup;
    } catch (error) {
      console.error("Failed to setup SSE:", error);
    }
  }, [isAuthenticated, sessionInfo, currentPath]);

  // Cleanup SSE on unmount or auth change
  useEffect(() => {
    return () => {
      if (sseCleanupRef.current) {
        sseCleanupRef.current();
        sseCleanupRef.current = null;
      }
    };
  }, []);

  // Setup SSE when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setupSSE();
    } else {
      if (sseCleanupRef.current) {
        sseCleanupRef.current();
        sseCleanupRef.current = null;
      }
    }

    return () => {
      if (sseCleanupRef.current) {
        sseCleanupRef.current();
        sseCleanupRef.current = null;
      }
    };
  }, [isAuthenticated, setupSSE]);

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
          ["u", `http://localhost:3000/auth/session`],
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

      console.log("Auth response:", response);
      console.log("Session ID:", response.sessionId);

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

      // Cleanup SSE
      if (sseCleanupRef.current) {
        sseCleanupRef.current();
        sseCleanupRef.current = null;
      }
    }
  };

  const loadDirectory = async (path: string, showLoading: boolean = true) => {
    if (!isAuthenticated) {
      setError("Authentication required");
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);

    try {
      console.log("Loading directory:", path);
      const listing = await client.listDirectory(path);
      console.log("Directory listing:", listing);
      
      // Ensure we always have an array
      const entries = listing?.entries || [];
      setFiles(entries);
      setCurrentPath(path);
      
      console.log("Set files:", entries);
    } catch (err: any) {
      console.error("Error loading directory:", err);
      if (err instanceof AuthenticationError) {
        setIsAuthenticated(false);
        setSessionInfo(null);
        setError("Session expired. Please login again.");
      } else {
        setError(err.message || "Failed to load directory");
      }
      setFiles([]); // Ensure files is always an array
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Enhanced navigation function to handle both files and directories
  const navigateToPath = async (path: string) => {
    if (!isAuthenticated) {
      setError("Authentication required");
      return;
    }

    console.log("Navigating to path:", path);

    try {
      setError(null);

      // First, try to get metadata to determine if it's a file or directory
      const metadata = await client.getMetadata(path);
      
      if (metadata) {
        // It's a file - always open preview
        console.log("Path is a file, opening preview:", path);
        setPreviewFile(path);
        return;
      }

      // It's a directory or doesn't exist, try to list it
      await loadDirectory(path, false);
    } catch (err: any) {
      console.error("Navigation error:", err);
      if (err.response?.status === 404) {
        // Could be a directory that doesn't exist or empty, try to list it anyway
        try {
          await loadDirectory(path, false);
        } catch (dirErr: any) {
          setError("File or directory not found");
        }
      } else {
        setError(err.message || "Failed to navigate");
      }
    }
  };

  // Add preview file state setter to the hook return
  const setPreviewFileState = (path: string | null) => {
    setPreviewFile(path);
  };

  const uploadFile = async (path: string, file: File) => {
    if (!isAuthenticated) throw new Error("Authentication required");

    // Initialize upload progress
    setUploadProgress((prev) => [
      ...prev,
      {
        fileName: file.name,
        status: "uploading",
      },
    ]);

    try {
      const buffer = await file.arrayBuffer();

      // Upload file
      await client.uploadFile(path, new Uint8Array(buffer));

      // Complete upload
      setUploadProgress((prev) =>
        prev.map((upload) =>
          upload.fileName === file.name && upload.status === "uploading"
            ? { ...upload, status: "completed" }
            : upload
        )
      );

      // Remove completed upload after delay
      setTimeout(() => {
        setUploadProgress((prev) =>
          prev.filter(
            (upload) =>
              !(upload.fileName === file.name && upload.status === "completed")
          )
        );
      }, 2000);

      await loadDirectory(currentPath, false); // Refresh without loading state
    } catch (err: any) {
      // Handle file lock error
      if (err instanceof FileLockError) {
        setUploadProgress((prev) =>
          prev.map((upload) =>
            upload.fileName === file.name && upload.status === "uploading"
              ? {
                  ...upload,
                  status: "error",
                  error: "File is currently being edited",
                }
              : upload
          )
        );
      } else {
        setUploadProgress((prev) =>
          prev.map((upload) =>
            upload.fileName === file.name && upload.status === "uploading"
              ? { ...upload, status: "error", error: err.message || "Upload failed" }
              : upload
          )
        );
      }

      // Remove failed upload after delay
      setTimeout(() => {
        setUploadProgress((prev) =>
          prev.filter(
            (upload) => !(upload.fileName === file.name && upload.status === "error")
          )
        );
      }, 5000);

      throw err;
    }
  };

  const deleteFile = async (path: string) => {
    if (!isAuthenticated) throw new Error("Authentication required");

    try {
      await client.deleteFile(path);
      await loadDirectory(currentPath, false); // Refresh without loading state
    } catch (err: any) {
      if (err instanceof FileLockError) {
        setError("Cannot delete file: it is currently being edited");
      } else {
        setError(err.message || "Failed to delete file");
      }
      throw err;
    }
  };

  const downloadFile = async (path: string) => {
    if (!isAuthenticated) throw new Error("Authentication required");

    try {
      const buffer = await client.downloadFile(path);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() || "download";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download file");
      throw err;
    }
  };

  // Check if file is locked
  const checkFileLock = async (path: string) => {
    try {
      // Try to get file metadata to check if it exists and is accessible
      const metadata = await client.getMetadata(path);
      return metadata !== null;
    } catch (err: any) {
      if (err instanceof FileLockError) {
        // Update file state to show it's locked
        setFileStates((prev) => {
          const newStates = new Map(prev);
          newStates.set(path, {
            path,
            isLocked: true,
            lockedBy: err.lockedBy,
            isPreviewOpen: false,
          });
          return newStates;
        });
        return false;
      }
      return true;
    }
  };

  // Get file content for preview
  const getFileForPreview = async (
    path: string
  ): Promise<{ content: string | ArrayBuffer; contentType: string } | null> => {
    try {
      const metadata = await client.getMetadata(path);
      if (!metadata) return null;

      if (
        metadata.contentType.startsWith("text/") ||
        metadata.contentType === "application/json" ||
        path.endsWith(".md")
      ) {
        const content = await client.downloadText(path);
        return { content, contentType: metadata.contentType };
      } else if (
        metadata.contentType.startsWith("image/") ||
        metadata.contentType.startsWith("video/") ||
        metadata.contentType === "application/pdf"
      ) {
        const buffer = await client.downloadFile(path);
        return { content: buffer, contentType: metadata.contentType };
      }

      return null;
    } catch (err: any) {
      console.error("Failed to get file for preview:", err);
      return null;
    }
  };

  // Clear upload progress manually
  const clearUploadProgress = (fileName: string) => {
    setUploadProgress((prev) =>
      prev.filter((upload) => upload.fileName !== fileName)
    );
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

    // Navigation - use the enhanced function
    onNavigate: navigateToPath,

    // Authentication
    isAuthenticated,
    sessionInfo,
    authLoading,
    authenticate,
    logout,
    checkAuth,

    // New premium features
    uploadProgress,
    clearUploadProgress,
    fileStates,
    checkFileLock,
    getFileForPreview,

    // Preview control
    previewFile,
    setPreviewFile: setPreviewFileState,

    // Client
    client,
  };
};
