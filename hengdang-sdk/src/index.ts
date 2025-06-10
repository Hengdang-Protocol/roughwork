import { HengdangClient } from './client';

export { HengdangClient } from './client';
export * from './types';

// Convenience function to create client
export function createClient(baseURL: string, options?: { timeout?: number; sessionId?: string }) {
  return new HengdangClient({
    baseURL,
    ...options
  });
}

// Convenience function to create authenticated client
export function createAuthenticatedClient(baseURL: string, sessionId: string, options?: { timeout?: number }) {
  return new HengdangClient({
    baseURL,
    sessionId,
    ...options
  });
}
