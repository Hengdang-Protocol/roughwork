import axios, { AxiosInstance } from 'axios';
import {
  FileMetadata,
  DirectoryListing,
  EventListing,
  ListOptions,
  UploadResponse,
  HengdangClientOptions
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
  async uploadFile(path: string, content: Buffer | Uint8Array | string): Promise<UploadResponse> {
    const response = await this.api.put(path, content, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    return response.data;
  }

  /**
   * Upload a text file
   */
  async uploadText(path: string, text: string): Promise<UploadResponse> {
    const response = await this.api.put(path, text, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    return response.data;
  }

  /**
   * Upload a JSON file
   */
  async uploadJSON(path: string, data: any): Promise<UploadResponse> {
    const response = await this.api.put(path, JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  /**
   * Download a file as buffer
   */
  async downloadFile(path: string): Promise<Buffer> {
    const response = await this.api.get(path, {
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  }

  /**
   * Download a file as text
   */
  async downloadText(path: string): Promise<string> {
    const response = await this.api.get(path, {
      responseType: 'text'
    });
    return response.data;
  }

  /**
   * Download and parse JSON file
   */
  async downloadJSON<T = any>(path: string): Promise<T> {
    const response = await this.api.get(path);
    return response.data;
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const response = await this.api.head(path);
      return {
        path,
        size: parseInt(response.headers['content-length'] || '0'),
        contentType: response.headers['content-type'] || 'application/octet-stream',
        hash: response.headers['etag']?.replace(/"/g, '') || '',
        timestamp: new Date(response.headers['last-modified'] || '').getTime()
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if file exists
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
   * Copy a file (download and re-upload)
   */
  async copyFile(sourcePath: string, destPath: string): Promise<UploadResponse> {
    const content = await this.downloadFile(sourcePath);
    return this.uploadFile(destPath, content);
  }

  /**
   * Move a file (copy and delete)
   */
  async moveFile(sourcePath: string, destPath: string): Promise<UploadResponse> {
    const result = await this.copyFile(sourcePath, destPath);
    await this.deleteFile(sourcePath);
    return result;
  }
}
