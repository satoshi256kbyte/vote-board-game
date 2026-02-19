import { describe, it, expect } from 'vitest';
import app from './index.js';

describe('API', () => {
  it('should return health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/unknown');
    expect(res.status).toBe(404);
  });
});
