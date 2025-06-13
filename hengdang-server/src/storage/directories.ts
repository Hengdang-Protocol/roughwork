import { storage } from './lmdb';
import { DirectoryMetadata, Event } from '../types';

export class DirectoryStorage {
  
  /**
   * Create a new directory
   */
  async createDirectory(
    path: string, 
    owner: string, 
    options: {
      permissions?: string[];
      description?: string;
    } = {}
  ): Promise<DirectoryMetadata> {
    // Normalize path - ensure it ends with /
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    // Check if directory already exists
    const existing = await this.getDirectory(normalizedPath);
    if (existing) {
      throw new Error('Directory already exists');
    }
    
    // Ensure parent directory exists (except for root)
    if (normalizedPath !== '/') {
      const parentPath = this.getParentPath(normalizedPath);
      const parent = await this.getDirectory(parentPath);
      if (!parent) {
        throw new Error('Parent directory does not exist');
      }
      
      // Check if user has permission to create in parent
      if (parent.owner !== owner) {
        throw new Error('No permission to create directory in parent');
      }
    }
    
    const now = Date.now();
    const metadata: DirectoryMetadata = {
      path: normalizedPath,
      owner,
      created: now,
      modified: now,
      permissions: options.permissions || [],
      description: options.description
    };
    
    await storage.directories.put(normalizedPath, metadata);
    
    // Create event
    const event: Event = {
      timestamp: now.toString(),
      operation: 'MKDIR',
      path: normalizedPath,
      type: 'directory'
    };
    await storage.events.put(now.toString(), event);
    
    return metadata;
  }
  
  /**
   * Get directory metadata
   */
  async getDirectory(path: string): Promise<DirectoryMetadata | null> {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    return await storage.directories.get(normalizedPath) || null;
  }
  
  /**
   * Delete a directory (must be empty)
   */
  async deleteDirectory(path: string, owner: string): Promise<boolean> {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    const directory = await this.getDirectory(normalizedPath);
    if (!directory) {
      return false;
    }
    
    // Check ownership
    if (directory.owner !== owner) {
      throw new Error('No permission to delete directory');
    }
    
    // Check if directory is empty
    if (!(await this.isDirectoryEmpty(normalizedPath))) {
      throw new Error('Directory is not empty');
    }
    
    await storage.directories.remove(normalizedPath);
    
    // Create event
    const event: Event = {
      timestamp: Date.now().toString(),
      operation: 'RMDIR',
      path: normalizedPath,
      type: 'directory'
    };
    await storage.events.put(Date.now().toString(), event);
    
    return true;
  }
  
  /**
   * Update directory metadata
   */
  async updateDirectory(
    path: string, 
    owner: string, 
    updates: {
      permissions?: string[];
      description?: string;
    }
  ): Promise<DirectoryMetadata | null> {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    const directory = await this.getDirectory(normalizedPath);
    if (!directory) {
      return null;
    }
    
    // Check ownership
    if (directory.owner !== owner) {
      throw new Error('No permission to update directory');
    }
    
    const updated: DirectoryMetadata = {
      ...directory,
      modified: Date.now(),
      permissions: updates.permissions !== undefined ? updates.permissions : directory.permissions,
      description: updates.description !== undefined ? updates.description : directory.description
    };
    
    await storage.directories.put(normalizedPath, updated);
    return updated;
  }
  
  /**
   * Check if directory exists
   */
  async exists(path: string): Promise<boolean> {
    const directory = await this.getDirectory(path);
    return directory !== null;
  }
  
  /**
   * Check if directory is empty (no files or subdirectories)
   */
  async isDirectoryEmpty(path: string): Promise<boolean> {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    // Check for files
    const fileRange = storage.files.getRange({
      start: normalizedPath,
      limit: 1
    });
    
    for (const { key: filePath } of fileRange) {
      if (filePath.startsWith(normalizedPath)) {
        return false;
      }
      break;
    }
    
    // Check for subdirectories
    const dirRange = storage.directories.getRange({
      start: normalizedPath,
      limit: 1
    });
    
    for (const { key: dirPath } of dirRange) {
      if (dirPath.startsWith(normalizedPath) && dirPath !== normalizedPath) {
        return false;
      }
      break;
    }
    
    return true;
  }
  
  /**
   * Ensure all parent directories exist, creating them if necessary
   */
  async ensureParentDirectories(filePath: string, owner: string): Promise<void> {
    const parentPath = this.getParentPath(filePath);
    if (parentPath === '/') {
      // Ensure root directory exists
      const root = await this.getDirectory('/');
      if (!root) {
        await this.createDirectory('/', owner);
      }
      return;
    }
    
    const parent = await this.getDirectory(parentPath);
    if (!parent) {
      // Recursively create parent directories
      await this.ensureParentDirectories(parentPath, owner);
      await this.createDirectory(parentPath, owner);
    }
  }
  
  /**
   * Get parent directory path
   */
  private getParentPath(path: string): string {
    const normalized = path.endsWith('/') ? path.slice(0, -1) : path;
    const lastSlash = normalized.lastIndexOf('/');
    
    if (lastSlash === 0) {
      return '/';
    }
    
    return normalized.substring(0, lastSlash) + '/';
  }
  
  /**
   * List all directories for a user
   */
  async listUserDirectories(owner: string): Promise<DirectoryMetadata[]> {
    const directories: DirectoryMetadata[] = [];
    const range = storage.directories.getRange({});
    
    for (const { value: directory } of range) {
      if (directory.owner === owner) {
        directories.push(directory);
      }
    }
    
    return directories;
  }
  
  /**
   * Get directory statistics
   */
  async getDirectoryStats(path: string): Promise<{
    fileCount: number;
    subdirectoryCount: number;
    totalSize: number;
  } | null> {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    const directory = await this.getDirectory(normalizedPath);
    if (!directory) {
      return null;
    }
    
    let fileCount = 0;
    let totalSize = 0;
    let subdirectoryCount = 0;
    
    // Count files
    const fileRange = storage.files.getRange({
      start: normalizedPath
    });
    
    for (const { key: filePath, value: fileMetadata } of fileRange) {
      if (!filePath.startsWith(normalizedPath)) break;
      
      fileCount++;
      totalSize += fileMetadata.contentLength;
    }
    
    // Count subdirectories
    const dirRange = storage.directories.getRange({
      start: normalizedPath
    });
    
    for (const { key: dirPath } of dirRange) {
      if (!dirPath.startsWith(normalizedPath) || dirPath === normalizedPath) {
        if (dirPath !== normalizedPath) break;
        continue;
      }
      
      subdirectoryCount++;
    }
    
    return {
      fileCount,
      subdirectoryCount,
      totalSize
    };
  }
}

export const directoryStorage = new DirectoryStorage();
