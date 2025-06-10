import { HengdangClient } from './client';

export { HengdangClient } from './client';
export * from './types';

// Convenience function to create client
export function createClient(baseURL: string, options?: { timeout?: number }) {
  return new HengdangClient({
    baseURL,
    ...options
  });
}
