import { Router, Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';

const router = Router();

// Store active SSE connections with session info and path filters
const sseConnections = new Map<string, { 
  response: Response; 
  pubkey: string; 
  pathFilter?: string; 
}>();

// GET /events/stream - Server-Sent Events endpoint with optional path filtering
router.get('/stream', authenticateSession, (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Store connection with session ID, pubkey, and optional path filter
  const sessionId = req.session!.sessionId;
  const pubkey = req.session!.pubkey;
  const pathFilter = req.query.path as string; // Optional: /documents/* or /documents/mydoc.txt
  
  sseConnections.set(sessionId, { response: res, pubkey, pathFilter });

  // Handle client disconnect
  req.on('close', () => {
    sseConnections.delete(sessionId);
  });

  req.on('aborted', () => {
    sseConnections.delete(sessionId);
  });
});

/**
 * Check if a path matches a filter pattern
 */
function pathMatches(filePath: string, filter: string): boolean {
  if (!filter) return true; // No filter = match everything
  if (filter.endsWith('/*')) {
    const prefix = filter.slice(0, -2);
    return filePath.startsWith(prefix);
  }
  return filePath === filter;
}

/**
 * Broadcast file change event to relevant connected clients
 */
export function broadcastFileChange(userPubkey: string, path: string, operation: 'PUT' | 'DELETE') {
  const event = {
    type: 'file_change',
    path,
    operation,
    timestamp: Date.now()
  };

  // Send only to connections for this user and matching path filter
  for (const [sessionId, connectionInfo] of sseConnections.entries()) {
    if (connectionInfo.pubkey === userPubkey && pathMatches(path, connectionInfo.pathFilter || '')) {
      try {
        connectionInfo.response.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        // Connection died, remove it
        sseConnections.delete(sessionId);
      }
    }
  }
}

/**
 * Get count of active SSE connections
 */
export function getActiveConnectionCount(): number {
  return sseConnections.size;
}

export default router;
