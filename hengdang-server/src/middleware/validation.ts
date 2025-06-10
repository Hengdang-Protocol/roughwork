import { Request, Response, NextFunction } from 'express';

export function validatePath(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  // Must start with /
  if (!path.startsWith('/')) {
    return res.status(400).json({ error: 'Path must start with /' });
  }

  // No .. traversal
  if (path.includes('..')) {
    return res.status(400).json({ error: 'Path traversal not allowed' });
  }

  // Check for control characters
  if (/[\x00-\x1f\x7f]/.test(path)) {
    return res.status(400).json({ error: 'Control characters not allowed in path' });
  }

  // Maximum path length
  if (path.length > 4096) {
    return res.status(400).json({ error: 'Path too long (max 4096 characters)' });
  }

  // No empty segments (double slashes)
  if (path.includes('//')) {
    return res.status(400).json({ error: 'Empty path segments not allowed' });
  }

  next();
}

export function parseListOptions(req: Request): {
  limit: number;
  cursor?: string;
  reverse: boolean;
  shallow: boolean;
} {
  const limit = Math.min(
    parseInt(req.query.limit as string) || 100,
    1000
  );
  
  const cursor = req.query.cursor as string;
  const reverse = req.query.reverse === 'true';
  const shallow = req.query.shallow !== 'false'; // Default true

  return { limit, cursor, reverse, shallow };
}

export function validateConditionalHeaders(req: Request, res: Response, next: NextFunction) {
  // Validate If-Match header format (should be ETag)
  const ifMatch = req.headers['if-match'];
  if (ifMatch && typeof ifMatch === 'string') {
    if (!ifMatch.match(/^"[^"]*"$/)) {
      return res.status(400).json({ 
        error: 'Invalid If-Match header format',
        message: 'If-Match must be a quoted ETag value'
      });
    }
  }

  // Validate If-None-Match header format
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && typeof ifNoneMatch === 'string') {
    if (ifNoneMatch !== '*' && !ifNoneMatch.match(/^"[^"]*"$/)) {
      return res.status(400).json({ 
        error: 'Invalid If-None-Match header format',
        message: 'If-None-Match must be "*" or a quoted ETag value'
      });
    }
  }

  // Validate date headers
  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && typeof ifModifiedSince === 'string') {
    const date = new Date(ifModifiedSince);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid If-Modified-Since header format',
        message: 'If-Modified-Since must be a valid HTTP date'
      });
    }
  }

  const ifUnmodifiedSince = req.headers['if-unmodified-since'];
  if (ifUnmodifiedSince && typeof ifUnmodifiedSince === 'string') {
    const date = new Date(ifUnmodifiedSince);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid If-Unmodified-Since header format',
        message: 'If-Unmodified-Since must be a valid HTTP date'
      });
    }
  }

  next();
}
