export interface FileMetadata {
  path: string;
  contentHash: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  chunkCount: number;
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
  operation: 'PUT' | 'DELETE';
  path: string;
}

export interface EventListing {
  events: Event[];
  nextCursor?: string;
  hasMore: boolean;
}

export const CHUNK_SIZE = 512 * 1024; // 512KB
export const DEFAULT_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 1000;
