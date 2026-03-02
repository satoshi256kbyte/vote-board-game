import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Suppress act(...) warnings from React 19 and Next.js Link internal updates
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    // Suppress act(...) warnings
    if (message.includes('not wrapped in act(...)')) {
      return;
    }
    // Suppress duplicate key warnings from intentional test cases
    if (message.includes('Encountered two children with the same key')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clear all mocks before each test
beforeEach(() => {
  // Clear any pending timers
  vi.clearAllTimers();
});

// Clean up after each test
afterEach(async () => {
  // Clear all timers to prevent React scheduler issues
  vi.clearAllTimers();

  // Wait for any pending microtasks to complete
  await new Promise((resolve) => setTimeout(resolve, 0));
});
