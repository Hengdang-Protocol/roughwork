import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  FileMetadata,
  DirectoryListing,
  EventListing,
  ListOptions,
  UploadResponse,
  HengdangClientOptions,
  ConditionalRequestOptions,
  NotModifiedError
} from './types';

export class HengdangClient {
  private api: AxiosInstance;

  constructor(options: HengdangClientOptions) {
    this.api = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      responseType: 'json'
    });
  }

  /**
   * Upload a file to the server
   */
  async uploadFile(path: string, content: Buffer | Uint8Array | string, options?: ConditionalRequestOptions): Promise<UploadResponse> {
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

    const response = await this.api.put(path, content, { headers });
    return response.data;
  }

  /**
   * Upload a text file
   */
  async uploadText(path: string, text: string, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain'
    };

    if (options?.ifMatch) headers['If-Match'] = options.ifMatch;
    if (options?.ifNoneMatch) headers['If-None-Match'] = options.ifNoneMatch;

    const response = await this.api.put(path, text, { headers });
    return response.data;
  }

  /**
   * Upload a JSON file
   */
  async uploadJSON(path: string, data: any, options?: ConditionalRequestOptions): Promise<UploadResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (options?.ifMatch) headers['If-Match'] = options.ifMatch;
    if (options?.ifNoneMatch) headers['If-None-Match'] = options.ifNoneMatch;

    const response = await this.api.put(path, JSON.stringify(data), { headers });
    return response.data;
  }

  /**
   * Download a file as buffer with conditional request support
   */
  async downloadFile(path: string, options?: ConditionalRequestOptions): Promise<Buffer> {
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
      return Buffer.from(response.data);
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
        responseType: 'text',
        headers
      });
      return response.data;
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
   * Download and parse JSON file with conditional request support
   */
  async downloadJSON<T = any>(path: string, options?: ConditionalRequestOptions): Promise<T> {
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
      const response = await this.api.get(path, { headers });
      return response.data;
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
   * Get file metadata using HEAD request
   */
  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const response = await this.api.head(path);
      return {
        path,
        size: parseInt(response.headers['content-length'] || '0'),
        contentType: response.headers['content-type'] || 'application/octet-stream',
        hash: this.extractHashFromETag(response.headers['etag']),
        timestamp: new Date(response.headers['last-modified'] || '').getTime(),
        etag: response.headers['etag'],
        lastModified: response.headers['last-modified']
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
    if (options.reverse) params.reverse = options.reverse;
    if (options.shallow !== undefined) params.shallow = options.shallow;

    const response = await this.api.get(path, { params });
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
  async syncFile(path: string, content: Buffer | Uint8Array | string): Promise<UploadResponse | null> {
    try {
      const metadata = await this.getMetadata(path);
      if (metadata?.etag) {
        // Try upload with If-None-Match to avoid overwriting unchanged files
        return await this.uploadFile(path, content, { ifNoneMatch: metadata.etag });
      } else {
        // File doesn't exist, upload normally
        return await this.uploadFile(path, content);
      }
    } catch (error: any) {
      if (error.response?.status === 412) {
        // Precondition failed - file hasn't changed
        return null;
      }
      throw error;
    }
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
