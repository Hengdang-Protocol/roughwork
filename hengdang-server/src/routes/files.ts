import { Router, Request, Response } from 'express';
import { fileStorage } from '../storage/files';
import { directoryStorage } from '../storage/directories';
import { validatePath, parseListOptions, validateConditionalHeaders } from '../middleware/validation';
import { checkFileLock, releaseFileLock, handleLockRequest } from '../middleware/locks';
import { broadcastFileChange, broadcastDirectoryChange } from './events-stream';
import { authenticateSession } from '../middleware/auth';
import { CreateDirectoryRequest } from '../types';

const router = Router();

// Helper function to generate ETag
function generateETag(contentHash: string, timestamp: number): string {
  return `"${contentHash}-${timestamp}"`;
}

// Helper function to format HTTP date
function formatHttpDate(timestamp: number): string {
  return new Date(timestamp).toUTCString();
}

// Helper function to parse HTTP date
function parseHttpDate(dateString: string): number {
  return new Date(dateString).getTime();
}

// HEAD - Get file metadata without content
router.head('/*', validatePath, authenticateSession, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const metadata = await fileStorage.getMetadata(path);

    if (!metadata) {
      return res.status(404).end();
    }

    // Check file ownership
    if (metadata.owner && req.session?.pubkey !== metadata.owner) {
      return res.status(403).end();
    }

    const etag = generateETag(metadata.contentHash, metadata.timestamp);
    const lastModified = formatHttpDate(metadata.timestamp);

    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.contentLength.toString(),
      'ETag': etag,
      'Last-Modified': lastModified,
      'Cache-Control': 'public, max-age=3600' // 1 hour cache
    });

    res.status(200).end();
  } catch (error) {
    console.error('HEAD error:', error);
    res.status(500).end();
  }
});

// GET - Read file or list directory with conditional request support
// Also handle lock requests (?lock=acquire/release/refresh/status)
router.get('/*', validatePath, authenticateSession, handleLockRequest, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    // Check if it's a directory first
    const directory = await directoryStorage.getDirectory(normalizedPath);
    if (directory) {
      // Check directory ownership
      if (req.session?.pubkey !== directory.owner) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Return directory listing
      const options = parseListOptions(req);
      const userPubkey = req.session?.pubkey;
      const listing = await fileStorage.listDirectory(normalizedPath, options, userPubkey);
      
      // Set cache headers for directory listings (shorter cache)
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache for directories
      });

      return res.json(listing);
    }

    // Check if it's a file
    const metadata = await fileStorage.getMetadata(path);
    if (metadata) {
      // Check file ownership
      if (metadata.owner && req.session?.pubkey !== metadata.owner) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // File exists - handle conditional requests first
      const etag = generateETag(metadata.contentHash, metadata.timestamp);
      const lastModified = formatHttpDate(metadata.timestamp);

      // Check If-None-Match (ETag)
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === etag) {
        return res.status(304).end();
      }

      // Check If-Modified-Since
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince) {
        const clientDate = parseHttpDate(ifModifiedSince);
        if (!isNaN(clientDate) && metadata.timestamp <= clientDate) {
          return res.status(304).end();
        }
      }

      // File modified or not cached - return content
      const result = await fileStorage.readFile(path);
      if (!result) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Set headers
      res.set({
        'Content-Type': result.metadata.contentType,
        'Content-Length': result.metadata.contentLength.toString(),
        'ETag': etag,
        'Last-Modified': lastModified,
        'Cache-Control': 'public, max-age=3600' // 1 hour cache
      });

      return res.send(result.content);
    }

    // Neither file nor directory found
    return res.status(404).json({ error: 'File or directory not found' });
  } catch (error: any) {
    console.error('GET error:', error);
    if (error.message === 'Directory not found') {
      return res.status(404).json({ error: 'Directory not found' });
    }
    if (error.message === 'No permission to list directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Create directory
router.post('/*', validatePath, authenticateSession, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    
    if (!req.session?.pubkey) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestBody: CreateDirectoryRequest = req.body || {};
    
    const directory = await directoryStorage.createDirectory(
      path,
      req.session.pubkey,
      {
        permissions: requestBody.permissions,
        description: requestBody.description
      }
    );

    // Broadcast directory change event to SSE clients
    broadcastDirectoryChange(req.session.pubkey, directory.path, 'MKDIR');

    res.status(201).json({
      path: directory.path,
      owner: directory.owner,
      created: directory.created
    });
  } catch (error: any) {
    console.error('POST (mkdir) error:', error);
    if (error.message === 'Directory already exists') {
      return res.status(409).json({ error: 'Directory already exists' });
    }
    if (error.message === 'Parent directory does not exist') {
      return res.status(400).json({ error: 'Parent directory does not exist' });
    }
    if (error.message === 'No permission to create directory in parent') {
      return res.status(403).json({ error: 'No permission to create directory in parent' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Write file with lock checking and proper response codes
router.put('/*', 
  validatePath, 
  validateConditionalHeaders, 
  authenticateSession,
  checkFileLock,      // Check/acquire lock before writing
  releaseFileLock,    // Release lock after writing
  async (req: Request, res: Response) => {
    try {
      const path = req.path;
      const content = req.body as Buffer;

      if (!Buffer.isBuffer(content)) {
        return res.status(400).json({ 
          error: 'Invalid content',
          message: 'Request body must be binary data'
        });
      }

      // Check if file already exists
      const existingMetadata = await fileStorage.getMetadata(path);
      const isUpdate = !!existingMetadata;

      // Check file ownership for updates
      if (existingMetadata && existingMetadata.owner && req.session?.pubkey !== existingMetadata.owner) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only modify your own files'
        });
      }

      // Handle conditional requests
      if (existingMetadata) {
        const existingETag = generateETag(existingMetadata.contentHash, existingMetadata.timestamp);
        
        // If-Match: only proceed if ETag matches (for safe updates)
        const ifMatch = req.headers['if-match'];
        if (ifMatch && ifMatch !== existingETag) {
          return res.status(412).json({ 
            error: 'Precondition Failed',
            message: 'File has been modified by another client',
            currentETag: existingETag
          });
        }

        // If-None-Match: only proceed if ETag doesn't match (avoid duplicates)
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && (ifNoneMatch === '*' || ifNoneMatch === existingETag)) {
          return res.status(412).json({ 
            error: 'Precondition Failed',
            message: 'File already exists with same content',
            currentETag: existingETag
          });
        }

        // If-Unmodified-Since: only proceed if not modified since date
        const ifUnmodifiedSince = req.headers['if-unmodified-since'];
        if (ifUnmodifiedSince) {
          const clientDate = parseHttpDate(ifUnmodifiedSince);
          if (!isNaN(clientDate) && existingMetadata.timestamp > clientDate) {
            return res.status(412).json({ 
              error: 'Precondition Failed',
              message: 'File has been modified since specified date',
              lastModified: formatHttpDate(existingMetadata.timestamp)
            });
          }
        }
      } else {
        // File doesn't exist - check If-Match (should fail)
        const ifMatch = req.headers['if-match'];
        if (ifMatch) {
          return res.status(412).json({ 
            error: 'Precondition Failed',
            message: 'Cannot match ETag for non-existent file'
          });
        }
      }

      const metadata = await fileStorage.writeFile(path, content, req.session?.pubkey);
      
      // Broadcast file change event to SSE clients
      if (req.session) {
        broadcastFileChange(req.session.pubkey, path, 'PUT');
      }
      
      const etag = generateETag(metadata.contentHash, metadata.timestamp);
      const lastModified = formatHttpDate(metadata.timestamp);

      res.set({
        'ETag': etag,
        'Last-Modified': lastModified,
        'Location': path
      });

      // 200 for updates, 201 for new files
      const statusCode = isUpdate ? 200 : 201;
      
      res.status(statusCode).json({
        path: metadata.path,
        size: metadata.contentLength,
        contentType: metadata.contentType,
        hash: metadata.contentHash,
        timestamp: metadata.timestamp,
        created: !isUpdate
      });
    } catch (error: any) {
      console.error('PUT error:', error);
      if (error.message === 'Storage limit exceeded') {
        return res.status(413).json({ 
          error: 'Storage limit exceeded',
          message: 'Upload would exceed your storage quota'
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE - Delete file or directory with proper response codes
router.delete('/*', validatePath, authenticateSession, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    // Check if it's a directory first
    const directory = await directoryStorage.getDirectory(normalizedPath);
    if (directory) {
      const deleted = await directoryStorage.deleteDirectory(normalizedPath, req.session!.pubkey);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Directory not found',
          message: 'The specified directory does not exist'
        });
      }

      // Broadcast directory change event to SSE clients
      if (req.session) {
        broadcastDirectoryChange(req.session.pubkey, normalizedPath, 'RMDIR');
      }

      return res.status(204).end();
    }

    // Check if it's a file
    const metadata = await fileStorage.getMetadata(path);
    if (metadata && metadata.owner && req.session?.pubkey !== metadata.owner) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only delete your own files'
      });
    }

    const deleted = await fileStorage.deleteFile(path);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'The specified file does not exist'
      });
    }

    // Broadcast file change event to SSE clients
    if (req.session) {
      broadcastFileChange(req.session.pubkey, path, 'DELETE');
    }

    // 204 No Content for successful deletion
    res.status(204).end();
  } catch (error: any) {
    console.error('DELETE error:', error);
    if (error.message === 'No permission to delete directory') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (error.message === 'Directory is not empty') {
      return res.status(409).json({ error: 'Directory is not empty' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
