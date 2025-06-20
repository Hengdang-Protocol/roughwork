export interface FileMetadata {
  path: string;
  contentHash: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  chunkCount: number;
  owner?: string; // pubkey of the owner
}

export interface DirectoryMetadata {
  path: string;
  owner: string;
  created: number;
  modified: number;
  permissions?: string[];
  description?: string;
}

export interface ChunkKey {
  fileId: string;
  chunkIndex: number;
}

export interface DirectoryEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  contentType?: string;
  lastModified: number;
  owner?: string;
}

export interface DirectoryListing {
  entries: DirectoryEntry[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
  shallow?: boolean;
}

export interface Event {
  timestamp: string;
  operation: 'PUT' | 'DELETE' | 'MKDIR' | 'RMDIR';
  path: string;
  type: 'file' | 'directory';
}

export interface EventListing {
  events: Event[];
  nextCursor?: string;
  hasMore: boolean;
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

export interface CreateDirectoryRequest {
  permissions?: string[];
  description?: string;
}

export interface CreateDirectoryResponse {
  path: string;
  owner: string;
  created: number;
}

export const CHUNK_SIZE = 512 * 1024; // 512KB
export const DEFAULT_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 1000;
