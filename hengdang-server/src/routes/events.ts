import { Router, Request, Response } from 'express';
import { storage } from '../storage/lmdb';
import { Event, EventListing } from '../types';

const router = Router();

// GET /events - List events with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      1000
    );
    const cursor = req.query.cursor as string;
    const reverse = req.query.reverse !== 'false'; // Default true (newest first)

    const events: Event[] = [];
    const startKey = cursor || (reverse ? '\xFF' : '');

    const range = storage.events.getRange({
      start: startKey,
      limit: limit + 1,
      reverse
    });

    for (const { key: timestamp, value: eventData } of range) {
      if (cursor && timestamp === cursor) continue; // Skip cursor item
      
      events.push({
        timestamp,
        operation: eventData.operation,
        path: eventData.path
      });
      
      if (events.length >= limit) break;
    }

    const hasMore = events.length > limit;
    if (hasMore) events.pop();

    const result: EventListing = {
      events,
      nextCursor: hasMore && events.length > 0 
        ? events[events.length - 1].timestamp 
        : undefined,
      hasMore
    };

    res.json(result);
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
