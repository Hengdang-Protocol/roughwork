import { Router, Request, Response } from 'express';
import { fileStorage } from '../storage/files';
import { validatePath, parseListOptions } from '../middleware/validation';

const router = Router();

// GET - Read file or list directory
router.get('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const metadata = await fileStorage.getMetadata(path);

    if (metadata) {
      // File exists - return file content
      const result = await fileStorage.readFile(path);
      if (!result) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Set headers
      res.set({
        'Content-Type': result.metadata.contentType,
        'Content-Length': result.metadata.contentLength.toString(),
        'ETag': `"${result.metadata.contentHash}"`,
        'Last-Modified': new Date(result.metadata.timestamp).toUTCString()
      });

      // Check if-none-match
      if (req.headers['if-none-match'] === `"${result.metadata.contentHash}"`) {
        return res.status(304).send();
      }

      res.send(result.content);
    } else {
      // Try directory listing
      const options = parseListOptions(req);
      const listing = await fileStorage.listDirectory(path, options);
      
      if (listing.entries.length === 0 && !path.endsWith('/')) {
        return res.status(404).json({ error: 'File or directory not found' });
      }

      res.json(listing);
    }
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HEAD - Get file metadata
router.head('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const metadata = await fileStorage.getMetadata(req.path);
    if (!metadata) {
      return res.status(404).send();
    }

    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.contentLength.toString(),
      'ETag': `"${metadata.contentHash}"`,
      'Last-Modified': new Date(metadata.timestamp).toUTCString()
    });

    res.status(200).send();
  } catch (error) {
    console.error('HEAD error:', error);
    res.status(500).send();
  }
});

// PUT - Write file
router.put('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const content = req.body as Buffer;

    if (!Buffer.isBuffer(content)) {
      return res.status(400).json({ error: 'Invalid content' });
    }

    const metadata = await fileStorage.writeFile(path, content);
    
    res.status(201).json({
      path: metadata.path,
      size: metadata.contentLength,
      contentType: metadata.contentType,
      hash: metadata.contentHash,
      timestamp: metadata.timestamp
    });
  } catch (error) {
    console.error('PUT error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete file
router.delete('/*', validatePath, async (req: Request, res: Response) => {
  try {
    const deleted = await fileStorage.deleteFile(req.path);
    
    if (!deleted) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('DELETE error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
