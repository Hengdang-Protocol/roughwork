import axios, { AxiosInstance } from 'axios';
import {
  FileMetadata,
  DirectoryListing,
  EventListing,
  ListOptions,
  UploadResponse,
  HengdangClientOptions,
  ConditionalRequestOptions,
  NotModifiedError,
  AuthenticationError,
  PreconditionFailedError,
  FileLockError,
  NostrEvent,
  AuthResponse,
  SessionInfo,
  FileChangeEvent,
  DirectoryChangeEvent,
  CreateDirectoryOptions,
  CreateDirectoryResponse
} from './types';

export class HengdangClient {
  private api: AxiosInstance;
  private sessionId?: string;
  private baseURL: string;

  constructor(options: HengdangClientOptions) {
    this.sessionId = options.sessionId;
    this.baseURL = options.baseURL;
    
    this.api = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      responseType: 'json',
      withCredentials: true // For session cookies
    });

    // Add auth interceptor
    this.api.interceptors.request.use((config) => {
      if (this.sessionId) {
        config.headers.Authorization = `Bearer ${this.sessionId}`;
      }
      return config;
    });

    // Add error handling interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new AuthenticationError(error.response.data?.message || 'Authentication required');
        }
        if (error.response?.status === 412) {
          throw new PreconditionFailedError(
            error.response.data?.message || 'Precondition failed',
            {
              currentETag: error.response.data?.currentETag,
              lastModified: error.response.data?.lastModified
            }
          );
        }
        if (error.response?.status === 423) {
          throw new FileLockError(
            error.response.data?.message || 'File is locked',
            {
              lockedBy: error.response.data?.lockedBy,
              lockedAt: error.response.data?.lockedAt,
              expiresAt: error.response.data?.expiresAt
            }
          );
        }
        throw error;
      }
    );
  }

  /**
   * Set session ID for authentication
   */
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Clear session ID
   */
  clearSession() {
    this.sessionId = undefined;
  }

  // === SSE METHODS ===

  /**
   * Subscribe to file change events via Server-Sent Events
   */
  subscribeToChanges(pathFilter?: string): EventSource {
    if (!this.sessionId) {
      throw new Error('Must be authenticated to subscribe to changes');
    }

    const url = new URL('/events/stream', this.baseURL);
    if (pathFilter) {
      url.searchParams.set('path', pathFilter);
    }

    const eventSource = new EventSource(url.toString(), {
      withCredentials: true
    });

    return eventSource;
  }

  /**
   * Subscribe to changes with a callback function
   */
  onFileChange(callback: (event: FileChangeEvent | DirectoryChangeEvent) => void, pathFilter?: string): () => void {
    const eventSource = this.subscribeToChanges(pathFilter);
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'file_change') {
          callback({
            path: data.path,
            operation: data.operation,
            timestamp: data.timestamp
          });
        } else if (data.type === 'directory_change') {
          callback({
            path: data.path,
            operation: data.operation,
            timestamp: data.timestamp
          });
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.addEventListener('message', handleMessage);

    // Return cleanup function
    return () => {
      eventSource.removeEventListener('message', handleMessage);
      eventSource.close();
    };
  }

  // === AUTHENTICATION METHODS ===

  /**
   * Create a new session using Nostr authentication
   */
  async createSession(authEvent: NostrEvent): Promise<AuthResponse> {
    const response = await this.api.post('/auth/session', authEvent);
    const authResponse: AuthResponse = response.data;
    
    // Automatically set session ID for future requests
    this.sessionId = authResponse.sessionId;
    
    return authResponse;
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<SessionInfo> {
    const response = await this.api.get('/auth/session');
    return response.data;
  }

  /**
   * Delete current session (logout)
   */
  async deleteSession(): Promise<void> {
    await this.api.delete('/auth/session');
    this.sessionId = undefined;
  }

  // === DIRECTORY OPERATIONS ===

  /**
   * Create a new directory
   */
  async createDirectory(path: string, options?: CreateDirectoryOptions): Promise<CreateDirectoryResponse> {
    const response = await this.api.post(path, options || {});
    return response.data;
  }

  /**
   * Delete a directory (must be empty)
   */
  async deleteDirectory(path: string): Promise<boolean> {
    try {
      const normalizedPath = path.endsWith('/') ? path : path + '/';
      await this.api.delete(normalizedPath);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  // === FILE OPERATIONS ===

  /**
   * Upload a file to the server
   */
  async uploadFile(path: string, content: Uint8Array | string, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream'
    };

    // Add conditional request headers
    if (options?.ifMatch) {
      headers['If-Match'] = options.ifMatch;
    }
    if (options?.ifNoneMatch) {
      headers['If-None-Match'] = options.ifNoneMatch;
    }
    if (options?.ifModifiedSince) {
      headers['If-Modified-Since'] = options.ifModifiedSince instanceof Date 
        ? options.ifModifiedSince.toUTCString()
        : options.ifModifiedSince;
    }
    if (options?.ifUnmodifiedSince) {
      headers['If-Unmodified-Since'] = options.ifUnmodifiedSince instanceof Date
        ? options.ifUnmodifiedSince.toUTCString()
        : options.ifUnmodifiedSince;
    }

    try {
      const response = await this.api.put(path, content, { headers });
      return response.data;
    } catch (error: any) {
      if (error instanceof FileLockError) {
        throw new Error(`File is locked: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Upload a text file
   */
  async uploadText(path: string, text: string, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const uint8 = new TextEncoder().encode(text);
    return this.uploadFile(path, uint8, options);
  }

  /**
   * Upload a JSON file
   */
  async uploadJSON(path: string, data: any, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const jsonString = JSON.stringify(data, null, 2);
    const uint8 = new TextEncoder().encode(jsonString);
    return this.uploadFile(path, uint8, options);
  }

  /**
   * Download a file as buffer with conditional request support
   */
  async downloadFile(path: string, options?: ConditionalRequestOptions): Promise<Uint8Array> {
    const headers: Record<string, string> = {};
    
    if (options?.ifNoneMatch) {
      headers['If-None-Match'] = options.ifNoneMatch;
    }
    if (options?.ifModifiedSince) {
      headers['If-Modified-Since'] = options.ifModifiedSince instanceof Date 
        ? options.ifModifiedSince.toUTCString()
        : options.ifModifiedSince;
    }

    try {
      const response = await this.api.get(path, {
        responseType: 'arraybuffer',
        headers
      });
      return new Uint8Array(response.data);
    } catch (error: any) {
      if (error.response?.status === 304) {
        throw new NotModifiedError('File not modified', {
          etag: error.response.headers['etag'],
          lastModified: error.response.headers['last-modified']
        });
      }
      throw error;
    }
  }

  /**
   * Download a file as text with conditional request support
   */
  async downloadText(path: string, options?: ConditionalRequestOptions): Promise<string> {
    const buffer = await this.downloadFile(path, options);
    return new TextDecoder('utf-8').decode(buffer);
  }

  /**
   * Download and parse JSON file with conditional request support
   */
  async downloadJSON<T = any>(path: string, options?: ConditionalRequestOptions): Promise<T> {
    const text = await this.downloadText(path, options);
    return JSON.parse(text);
  }

  /**
   * Get file metadata using HEAD request
   */
  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const response = await this.api.head(path);
      
      // Extract hash from ETag (format: "hash-timestamp")
      const etag = response.headers['etag'] || '';
      const hash = this.extractHashFromETag(etag);
      
      return {
        path,
        contentLength: parseInt(response.headers['content-length'] || '0'),
        contentType: response.headers['content-type'] || 'application/octet-stream',
        contentHash: hash,
        timestamp: new Date(response.headers['last-modified'] || '').getTime(),
        chunkCount: 1 // Not exposed by server, but required by interface
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if file exists using HEAD request
   */
  async exists(path: string): Promise<boolean> {
    const metadata = await this.getMetadata(path);
    return metadata !== null;
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      await this.api.delete(path);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string, options: ListOptions = {}): Promise<DirectoryListing> {
    const params: any = {};
    if (options.limit) params.limit = options.limit;
    if (options.cursor) params.cursor = options.cursor;
    if (options.reverse !== undefined) params.reverse = options.reverse;
    if (options.shallow !== undefined) params.shallow = options.shallow;

    const normalizedPath = path.endsWith('/') ? path : path + '/';
    const response = await this.api.get(normalizedPath, { params });
    return response.data;
  }

  /**
   * List all files in directory (recursively)
   */
  async listAllFiles(path: string): Promise<DirectoryListing> {
    return this.listDirectory(path, { shallow: false, limit: 1000 });
  }

  /**
   * Get recent events
   */
  async getEvents(options: { limit?: number; cursor?: string; reverse?: boolean } = {}): Promise<EventListing> {
    const params: any = {};
    if (options.limit) params.limit = options.limit;
    if (options.cursor) params.cursor = options.cursor;
    if (options.reverse !== undefined) params.reverse = options.reverse;

    const response = await this.api.get('/events', { params });
    return response.data;
  }

  /**
   * Get server health status
   */
  async getHealth(): Promise<{ status: string; timestamp: number; version: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // === CONVENIENCE METHODS ===

  /**
   * Copy a file (download and re-upload) with optional conditional requests
   */
  async copyFile(sourcePath: string, destPath: string, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const content = await this.downloadFile(sourcePath);
    return this.uploadFile(destPath, content, options);
  }

  /**
   * Move a file (copy and delete) with optional conditional requests
   */
  async moveFile(sourcePath: string, destPath: string, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const result = await this.copyFile(sourcePath, destPath, options);
    await this.deleteFile(sourcePath);
    return result;
  }

  /**
   * Sync file only if it has changed (using ETag/Last-Modified)
   */
  async syncFile(path: string, content: Uint8Array | string): Promise<UploadResponse | null> {
    try {
      const metadata = await this.getMetadata(path);
      if (metadata) {
        const etag = this.generateETag(metadata.contentHash, metadata.timestamp);
        // Try upload with If-None-Match to avoid overwriting unchanged files
        return await this.uploadFile(path, content, { ifNoneMatch: etag });
      } else {
        // File doesn't exist, upload normally
        return await this.uploadFile(path, content);
      }
    } catch (error: any) {
      if (error instanceof PreconditionFailedError) {
        // File hasn't changed
        return null;
      }
      throw error;
    }
  }

  /**
   * Batch upload multiple files
   */
  async uploadBatch(files: Array<{ path: string; content: Uint8Array | string }>): Promise<UploadResponse[]> {
    const results = await Promise.allSettled(
      files.map(file => this.uploadFile(file.path, file.content))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        throw new Error(`Failed to upload ${files[index].path}: ${result.reason.message}`);
      }
    });
  }

  /**
   * Generate ETag from hash and timestamp (matches server format)
   */
  private generateETag(hash: string, timestamp: number): string {
    return `"${hash}-${timestamp}"`;
  }

  /**
   * Extract hash from ETag header (removes quotes and timestamp)
   */
  private extractHashFromETag(etag: string | undefined): string {
    if (!etag) return '';
    // ETag format: "hash-timestamp"
    const cleaned = etag.replace(/"/g, '');
    const hashPart = cleaned.split('-')[0];
    return hashPart || cleaned;
  }
}
