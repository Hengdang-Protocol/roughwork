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
