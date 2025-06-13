export interface FileMetadata {
  path: string;
  contentHash: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  chunkCount: number;
}

export interface DirectoryEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  contentType?: string;
  lastModified: number;
}

export interface DirectoryListing {
  entries: DirectoryEntry[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface EventListing {
  events: Event[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
  shallow?: boolean;
}

export interface UploadResponse {
  path: string;
  size: number;
  contentType: string;
  hash: string;
  timestamp: number;
  created: boolean;
}

export interface NostrEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface Session {
  sessionId: string;
  pubkey: string;
  permissions: string[];
  appName?: string;
  createdAt: number;
  lastUsed: number;
  expiresAt: number;
}

export interface AuthResponse {
  sessionId: string;
  permissions: string[];
  expiresAt: number;
}

export interface SessionInfo {
  sessionId: string;
  permissions: string[];
  appName?: string;
  createdAt: number;
  lastUsed: number;
  expiresAt: number;
}

export interface SessionListResponse {
  sessions: Array<SessionInfo & { isCurrent: boolean }>;
}

export interface HengdangClientOptions {
  baseURL: string;
  timeout?: number;
  sessionId?: string;
}

export interface ConditionalRequestOptions {
  /**
   * Only perform the action if the entity matches one of the given ETags
   * Used for updates to ensure you're modifying the expected version
   */
  ifMatch?: string;
  
  /**
   * Only perform the action if the entity doesn't match any of the given ETags
   * Used to avoid creating duplicates or overwriting changes
   */
  ifNoneMatch?: string;
  
  /**
   * Only perform the action if the entity has been modified since the given date
   * Used to avoid unnecessary downloads
   */
  ifModifiedSince?: Date | string;
  
  /**
   * Only perform the action if the entity has not been modified since the given date
   * Used for safe updates
   */
  ifUnmodifiedSince?: Date | string;
}

export interface CreateDirectoryOptions {
  description?: string;
}

export interface CreateDirectoryResponse {
  path: string;
  owner: string;
  created: number;
}

// === SSE TYPES ===

export interface FileChangeEvent {
  path: string;
  operation: 'PUT' | 'DELETE';
  timestamp: number;
}

export interface DirectoryChangeEvent {
  path: string;
  operation: 'MKDIR' | 'RMDIR';
  timestamp: number;
}

export interface Event {
  timestamp: string;
  operation: 'PUT' | 'DELETE' | 'MKDIR' | 'RMDIR';
  path: string;
  type: 'file' | 'directory';
}

// === ERROR TYPES ===

export class NotModifiedError extends Error {
  public readonly etag?: string;
  public readonly lastModified?: string;
  
  constructor(message: string, metadata?: { etag?: string; lastModified?: string }) {
    super(message);
    this.name = 'NotModifiedError';
    this.etag = metadata?.etag;
    this.lastModified = metadata?.lastModified;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PreconditionFailedError extends Error {
  public readonly currentETag?: string;
  public readonly lastModified?: string;
  
  constructor(message: string, metadata?: { currentETag?: string; lastModified?: string }) {
    super(message);
    this.name = 'PreconditionFailedError';
    this.currentETag = metadata?.currentETag;
    this.lastModified = metadata?.lastModified;
  }
}

export class FileLockError extends Error {
  public readonly lockedBy?: string;
  public readonly lockedAt?: number;
  public readonly expiresAt?: number;
  
  constructor(message: string, metadata?: { lockedBy?: string; lockedAt?: number; expiresAt?: number }) {
    super(message);
    this.name = 'FileLockError';
    this.lockedBy = metadata?.lockedBy;
    this.lockedAt = metadata?.lockedAt;
    this.expiresAt = metadata?.expiresAt;
  }
}
