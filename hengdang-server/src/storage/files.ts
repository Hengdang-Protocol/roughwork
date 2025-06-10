import { createHash } from 'crypto';
import { storage } from './lmdb';
import { FileMetadata, DirectoryEntry, DirectoryListing, ListOptions, Event, CHUNK_SIZE } from '../types';

export class FileStorage {
  
  async writeFile(path: string, content: Buffer): Promise<FileMetadata> {
    const fileId = storage.generateFileId();
    const contentHash = createHash('sha256').update(content).digest('hex');
    const contentType = this.detectContentType(content, path);
    const timestamp = Date.now();
    
    // Store chunks
    const chunkCount = Math.ceil(content.length / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, content.length);
      const chunk = content.slice(start, end);
      const chunkKey = storage.generateChunkKey(fileId, i);
      
      await storage.blobs.put(chunkKey, chunk);
    }

    // Store metadata
    const metadata: FileMetadata = {
      path,
      contentHash,
      contentType,
      contentLength: content.length,
      timestamp,
      chunkCount
    };

    await storage.files.put(path, metadata);

    // Create event
    const event: Event = {
      timestamp: timestamp.toString(),
      operation: 'PUT',
      path
    };
    await storage.events.put(timestamp.toString(), event);

    return metadata;
  }

  async readFile(path: string): Promise<{ metadata: FileMetadata; content: Buffer } | null> {
    const metadata = await storage.files.get(path);
    if (!metadata) return null;

    const chunks: Buffer[] = [];
    const fileId = metadata.timestamp.toString();
    
    for (let i = 0; i < metadata.chunkCount; i++) {
      const chunkKey = storage.generateChunkKey(fileId, i);
      const chunk = await storage.blobs.get(chunkKey);
      if (chunk) chunks.push(chunk);
    }

    const content = Buffer.concat(chunks);
    return { metadata, content };
  }

  async deleteFile(path: string): Promise<boolean> {
    const metadata = await storage.files.get(path);
    if (!metadata) return false;

    const fileId = metadata.timestamp.toString();
    
    // Delete chunks
    for (let i = 0; i < metadata.chunkCount; i++) {
      const chunkKey = storage.generateChunkKey(fileId, i);
      await storage.blobs.remove(chunkKey);
    }

    // Delete metadata
    await storage.files.remove(path);

    // Create event
    const event: Event = {
      timestamp: Date.now().toString(),
      operation: 'DELETE',
      path
    };
    await storage.events.put(Date.now().toString(), event);

    return true;
  }

  async getMetadata(path: string): Promise<FileMetadata | undefined> {
    return await storage.files.get(path);
  }

  async listDirectory(dirPath: string, options: ListOptions): Promise<DirectoryListing> {
    const { limit = 100, cursor, reverse = false, shallow = true } = options;
    const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    const startKey = cursor || prefix;
    
    const entries: DirectoryEntry[] = [];
    const seen = new Set<string>();

    const range = storage.files.getRange({
      start: startKey,
      limit: limit + 1,
      reverse
    });

    for (const { key: filePath, value: metadata } of range) {
      if (!filePath.startsWith(prefix)) break;
      
      if (shallow) {
        const relativePath = filePath.substring(prefix.length);
        const firstSegment = relativePath.split('/')[0];
        
        if (seen.has(firstSegment)) continue;
        seen.add(firstSegment);
        
        const isDirectory = relativePath.includes('/');
        entries.push({
          path: prefix + firstSegment + (isDirectory ? '/' : ''),
          type: isDirectory ? 'directory' : 'file',
          size: isDirectory ? undefined : metadata.contentLength,
          contentType: isDirectory ? undefined : metadata.contentType,
          lastModified: metadata.timestamp
        });
      } else {
        entries.push({
          path: filePath,
          type: 'file',
          size: metadata.contentLength,
          contentType: metadata.contentType,
          lastModified: metadata.timestamp
        });
      }
      
      if (entries.length >= limit) break;
    }

    const hasMore = entries.length > limit;
    if (hasMore) entries.pop();
    
    return {
      entries,
      nextCursor: hasMore && entries.length > 0 ? entries[entries.length - 1].path : undefined,
      hasMore
    };
  }

  private detectContentType(content: Buffer, path: string): string {
    // Basic magic byte detection
    if (content.length >= 8) {
      const header = content.slice(0, 8);
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        return 'image/png';
      }
      if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        return 'image/jpeg';
      }
    }

    // Fallback to extension
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt': return 'text/plain';
      case 'json': return 'application/json';
      case 'html': return 'text/html';
      case 'css': return 'text/css';
      case 'js': return 'application/javascript';
      default: return 'application/octet-stream';
    }
  }
}

export const fileStorage = new FileStorage();
