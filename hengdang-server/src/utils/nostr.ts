import { verifyEvent, getEventHash } from 'nostr-tools';
import { NostrEvent } from '../types';

/**
 * Calculate event ID using nostr-tools
 */
export function calculateEventId(event: Omit<NostrEvent, 'id' | 'sig'>): string {
  return getEventHash(event as any);
}

/**
 * Verify a Nostr event signature using nostr-tools
 */
export function verifyEventSignature(event: NostrEvent): boolean {
  try {
    const isValid = verifyEvent(event as any);
    console.log('Event verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Event verification error:', error);
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

  return ['read', 'write']; // Default permissions
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
  console.log('=== Auth Event Validation ===');
  console.log('Expected URL:', expectedUrl);
  console.log('Expected Method:', expectedMethod);
  
  // Check event kind
  if (event.kind !== 27235) {
    console.log('Invalid event kind:', event.kind);
    return false;
  }

  // Check if event is not too old (1 hour max)
  const now = Math.floor(Date.now() / 1000);
  const age = now - event.created_at;
  console.log('Event age (seconds):', age);
  if (age > 3600) {
    console.log('Event too old');
    return false;
  }

  // Check URL and method in tags
  const urlTag = event.tags.find(tag => tag[0] === 'u');
  const methodTag = event.tags.find(tag => tag[0] === 'method');

  console.log('URL tag:', urlTag);
  console.log('Method tag:', methodTag);

  if (!urlTag || urlTag[1] !== expectedUrl) {
    console.log('URL mismatch. Expected:', expectedUrl, 'Got:', urlTag?.[1]);
    return false;
  }

  if (!methodTag || methodTag[1] !== expectedMethod) {
    console.log('Method mismatch. Expected:', expectedMethod, 'Got:', methodTag?.[1]);
    return false;
  }

  console.log('Auth event validation passed');
  return true;
}
