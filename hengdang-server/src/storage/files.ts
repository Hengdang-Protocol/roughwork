import { createHash } from 'crypto';
import { storage } from './lmdb';
import { directoryStorage } from './directories';
import { userStorage } from './users';
import { FileMetadata, DirectoryEntry, DirectoryListing, ListOptions, Event, CHUNK_SIZE } from '../types';

export class FileStorage {
  
  async writeFile(path: string, content: Buffer, userPubkey?: string): Promise<FileMetadata> {
    // Check storage limit if user provided
    if (userPubkey) {
      const hasSpace = await userStorage.checkStorageLimit(userPubkey, content.length);
      if (!hasSpace) {
        throw new Error('Storage limit exceeded');
      }
    }

    // Ensure parent directories exist
    if (userPubkey) {
      await directoryStorage.ensureParentDirectories(path, userPubkey);
    }

    const fileId = storage.generateFileId();
    const contentHash = createHash('sha256').update(content).digest('hex');
    const contentType = this.detectContentType(content, path);
    const timestamp = Date.now();
    
    // Check if file exists (for storage accounting)
    const existingMetadata = await storage.files.get(path);
    const bytesChanged = content.length - (existingMetadata?.contentLength || 0);
    
    // Store chunks
    const chunkCount = Math.ceil(content.length / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, content.length);
      const chunk = content.slice(start, end);
      const chunkKey = storage.generateChunkKey(fileId, i);
      
      await storage.blobs.put(chunkKey, chunk);
    }

    // Store metadata with owner info
    const metadata: FileMetadata = {
      path,
      contentHash,
      contentType,
      contentLength: content.length,
      timestamp,
      chunkCount,
      owner: userPubkey // Add owner field
    };

    await storage.files.put(path, metadata);

    // Update user storage usage
    if (userPubkey && bytesChanged !== 0) {
      await userStorage.updateStorageUsage(userPubkey, bytesChanged);
    }

    // Create event
    const event: Event = {
      timestamp: timestamp.toString(),
      operation: 'PUT',
      path,
      type: 'file'
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

    // Update user storage usage
    if (metadata.owner) {
      await userStorage.updateStorageUsage(metadata.owner, -metadata.contentLength);
    }

    // Delete metadata
    await storage.files.remove(path);

    // Create event
    const event: Event = {
      timestamp: Date.now().toString(),
      operation: 'DELETE',
      path,
      type: 'file'
    };
    await storage.events.put(Date.now().toString(), event);

    return true;
  }

  async getMetadata(path: string): Promise<FileMetadata | undefined> {
    return await storage.files.get(path);
  }

  async listDirectory(dirPath: string, options: ListOptions, userPubkey?: string): Promise<DirectoryListing> {
    const { limit = 100, cursor, reverse = false, shallow = true } = options;
    const normalizedPath = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    
    // Check if directory exists
    const directory = await directoryStorage.getDirectory(normalizedPath);
    if (!directory) {
      throw new Error('Directory not found');
    }
    
    // Check permissions
    if (userPubkey && directory.owner !== userPubkey) {
      throw new Error('No permission to list directory');
    }
    
    const entries: DirectoryEntry[] = [];
    let foundCursor = !cursor;

    if (shallow) {
      // List immediate children only
      
      // First, list subdirectories
      const dirRange = storage.directories.getRange({
        start: normalizedPath,
        reverse
      });

      for (const { key: subDirPath, value: subDirMetadata } of dirRange) {
        if (!subDirPath.startsWith(normalizedPath) || subDirPath === normalizedPath) {
          if (subDirPath !== normalizedPath) break;
          continue;
        }
        
        // Check if this is a direct child (no additional slashes)
        const relativePath = subDirPath.substring(normalizedPath.length);
        const trimmed = relativePath.endsWith('/') ? relativePath.slice(0, -1) : relativePath;
        if (trimmed.includes('/')) continue; // Not a direct child
        
        if (cursor && !foundCursor) {
          if (subDirPath === cursor) foundCursor = true;
          continue;
        }
        
        if (entries.length >= limit) break;
        
        entries.push({
          path: subDirPath,
          type: 'directory',
          lastModified: subDirMetadata.modified,
          owner: subDirMetadata.owner
        });
      }
      
      // Then, list files in this directory
      const fileRange = storage.files.getRange({
        start: normalizedPath,
        reverse
      });

      for (const { key: filePath, value: fileMetadata } of fileRange) {
        if (!filePath.startsWith(normalizedPath)) break;
        
        // Check if this is a direct child file
        const relativePath = filePath.substring(normalizedPath.length);
        if (relativePath.includes('/')) continue; // File in subdirectory
        
        if (cursor && !foundCursor) {
          if (filePath === cursor) foundCursor = true;
          continue;
        }
        
        if (entries.length >= limit) break;
        
        entries.push({
          path: filePath,
          type: 'file',
          size: fileMetadata.contentLength,
          contentType: fileMetadata.contentType,
          lastModified: fileMetadata.timestamp,
          owner: fileMetadata.owner
        });
      }
    } else {
      // List all descendants (recursive)
      
      // List all subdirectories
      const dirRange = storage.directories.getRange({
        start: normalizedPath,
        reverse
      });

      for (const { key: subDirPath, value: subDirMetadata } of dirRange) {
        if (!subDirPath.startsWith(normalizedPath) || subDirPath === normalizedPath) {
          if (subDirPath !== normalizedPath) break;
          continue;
        }
        
        if (cursor && !foundCursor) {
          if (subDirPath === cursor) foundCursor = true;
          continue;
        }
        
        if (entries.length >= limit) break;
        
        entries.push({
          path: subDirPath,
          type: 'directory',
          lastModified: subDirMetadata.modified,
          owner: subDirMetadata.owner
        });
      }
      
      // List all files
      const fileRange = storage.files.getRange({
        start: normalizedPath,
        reverse
      });

      for (const { key: filePath, value: fileMetadata } of fileRange) {
        if (!filePath.startsWith(normalizedPath)) break;
        
        if (cursor && !foundCursor) {
          if (filePath === cursor) foundCursor = true;
          continue;
        }
        
        if (entries.length >= limit) break;
        
        entries.push({
          path: filePath,
          type: 'file',
          size: fileMetadata.contentLength,
          contentType: fileMetadata.contentType,
          lastModified: fileMetadata.timestamp,
          owner: fileMetadata.owner
        });
      }
    }

    // Sort entries by type (directories first) then by path
    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return reverse ? b.path.localeCompare(a.path) : a.path.localeCompare(b.path);
    });

    const hasMore = entries.length >= limit;
    const actualEntries = hasMore ? entries.slice(0, limit) : entries;
    
    return {
      entries: actualEntries,
      nextCursor: hasMore && actualEntries.length > 0 ? actualEntries[actualEntries.length - 1].path : undefined,
      hasMore
    };
  }

  private detectContentType(content: Buffer, path: string): string {
    // Basic magic byte detection
    if (content.length >= 8) {
      const header = content.slice(0, 8);
      
      // PNG
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        return 'image/png';
      }
      
      // JPEG
      if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        return 'image/jpeg';
      }
      
      // GIF
      if (header.slice(0, 6).toString() === 'GIF87a' || header.slice(0, 6).toString() === 'GIF89a') {
        return 'image/gif';
      }
      
      // PDF
      if (header.slice(0, 4).toString() === '%PDF') {
        return 'application/pdf';
      }
      
      // ZIP
      if (header[0] === 0x50 && header[1] === 0x4B && 
          (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07)) {
        return 'application/zip';
      }
    }

    // JSON detection by content
    if (content.length > 0) {
      const text = content.toString('utf8', 0, Math.min(content.length, 1024));
      const trimmed = text.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          JSON.parse(trimmed);
          return 'application/json';
        } catch {
          // Not valid JSON, continue to extension detection
        }
      }
    }

    // Fallback to extension
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt': return 'text/plain';
      case 'json': return 'application/json';
      case 'html': case 'htm': return 'text/html';
      case 'css': return 'text/css';
      case 'js': return 'application/javascript';
      case 'xml': return 'application/xml';
      case 'csv': return 'text/csv';
      case 'md': return 'text/markdown';
      case 'png': return 'image/png';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'svg': return 'image/svg+xml';
      case 'webp': return 'image/webp';
      case 'pdf': return 'application/pdf';
      case 'zip': return 'application/zip';
      case 'tar': return 'application/x-tar';
      case 'gz': return 'application/gzip';
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'ogg': return 'audio/ogg';
      default: return 'application/octet-stream';
    }
  }
}

export const fileStorage = new FileStorage();
