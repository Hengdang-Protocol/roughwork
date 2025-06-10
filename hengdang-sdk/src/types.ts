export interface FileMetadata {
  path: string;
  size: number;
  contentType: string;
  hash: string;
  timestamp: number;
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
}

export interface HengdangClientOptions {
  baseURL: string;
  timeout?: number;
}
