import { Router, Request, Response } from 'express';
import { fileStorage } from '../storage/files';
import { validatePath, parseListOptions, validateConditionalHeaders } from '../middleware/validation';

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
router.head('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const metadata = await fileStorage.getMetadata(req.path);
    if (!metadata) {
      return res.status(404).end();
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
router.get('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const metadata = await fileStorage.getMetadata(path);

    if (metadata) {
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

      res.send(result.content);
    } else {
      // Try directory listing
      const options = parseListOptions(req);
      const listing = await fileStorage.listDirectory(path, options);
      
      if (listing.entries.length === 0 && !path.endsWith('/')) {
        return res.status(404).json({ error: 'File or directory not found' });
      }

      // Set cache headers for directory listings (shorter cache)
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache for directories
      });

      res.json(listing);
    }
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Write file with proper response codes and conditional request support
router.put('/*', validatePath, validateConditionalHeaders, async (req: Request, res: Response) => {
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

    const metadata = await fileStorage.writeFile(path, content);
    
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
  } catch (error) {
    console.error('PUT error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete file with proper response codes
router.delete('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const deleted = await fileStorage.deleteFile(req.path);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'The specified file does not exist'
      });
    }

    // 204 No Content for successful deletion
    res.status(204).end();
  } catch (error) {
    console.error('DELETE error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
