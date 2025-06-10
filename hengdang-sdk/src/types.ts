export interface FileMetadata {
  path: string;
  size: number;
  contentType: string;
  hash: string;
  timestamp: number;
  etag?: string;
  lastModified?: string;
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
  created?: boolean; // true for new files, false for updates
}

export interface HengdangClientOptions {
  baseURL: string;
  timeout?: number;
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
