/**
 * Mock mode exports
 */

export { getMockResponse } from './mockApi';
export * from './data';

// Check if mock mode is enabled
export const isMockMode = (): boolean => {
  return import.meta.env.VITE_MOCK_MODE === 'true';
};
