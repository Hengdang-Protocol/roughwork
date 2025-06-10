import { createHash } from 'crypto';
import { NostrEvent } from '../types';

const secp256k1 = require('secp256k1');

/**
 * Calculate event ID (sha256 of serialized event)
 */
export function calculateEventId(event: Omit<NostrEvent, 'id' | 'sig'>): string {
  const serialized = JSON.stringify([
    0, // Reserved for future use
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content
  ]);

  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Verify a Nostr event signature
 */
export function verifyEventSignature(event: NostrEvent): boolean {
  try {
    // Recalculate event ID
    const expectedId = calculateEventId(event);
    if (event.id && event.id !== expectedId) {
      return false;
    }

    // Convert hex strings to buffers
    const pubkeyBuffer = Buffer.from(event.pubkey, 'hex');
    const signatureBuffer = Buffer.from(event.sig, 'hex');
    const messageBuffer = Buffer.from(expectedId, 'hex');

    // Verify signature
    return secp256k1.ecdsaVerify(signatureBuffer, messageBuffer, pubkeyBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Extract permissions from auth event
 */
export function extractPermissions(event: NostrEvent): string[] {
  const scopeTags = event.tags.filter(tag => tag[0] === 'scope');
  if (scopeTags.length > 0) {
    return scopeTags.map(tag => tag[1]);
  }

  return [];
}

/**
 * Extract app name from auth event
 */
export function extractAppName(event: NostrEvent): string {
  const appTag = event.tags.find(tag => tag[0] === 'app');
  if (appTag) {
    return appTag[1];
  }

  // Fallback: parse from content
  try {
    const content = JSON.parse(event.content);
    return content.app || 'Unknown App';
  } catch {
    return 'Unknown App';
  }
}

/**
 * Validate auth event for our server
 */
export function validateAuthEvent(event: NostrEvent, expectedUrl: string, expectedMethod: string): boolean {
  // Check event kind
  if (event.kind !== 27235) {
    return false;
  }

  // Check if event is not too old (1 hour max)
  const now = Math.floor(Date.now() / 1000);
  if (now - event.created_at > 3600) {
    return false;
  }

  // Check URL and method in tags
  const urlTag = event.tags.find(tag => tag[0] === 'u');
  const methodTag = event.tags.find(tag => tag[0] === 'method');

  if (!urlTag || urlTag[1] !== expectedUrl) {
    return false;
  }

  if (!methodTag || methodTag[1] !== expectedMethod) {
    return false;
  }

  return true;
}
