import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';

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
