import { describe, it, expect, vi, beforeEach } from 'vitest';
import { corsMiddleware, isOriginAllowed } from './cors.js';
import type { Context, Next } from 'hono';

type MockFn = ReturnType<typeof vi.fn>;

describe('CORS Middleware', () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;

  beforeEach(() => {
    mockContext = {
      req: {
        header: vi.fn(),
        method: 'GET',
      } as unknown as Context['req'],
      header: vi.fn(),
      text: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('corsMiddleware', () => {
    it('should allow requests from Vercel production domain', async () => {
      const allowedOrigins = 'https://vote-board-game-web.vercel.app';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('https://vote-board-game-web.vercel.app');

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://vote-board-game-web.vercel.app'
      );
      expect(mockContext.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from Vercel preview domains with wildcard', async () => {
      const allowedOrigins = 'https://*.vercel.app';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('https://my-preview-abc123.vercel.app');

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://my-preview-abc123.vercel.app'
      );
      expect(mockContext.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from localhost', async () => {
      const allowedOrigins = 'http://localhost:3000';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('http://localhost:3000');

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
      expect(mockContext.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from multiple allowed origins', async () => {
      const allowedOrigins =
        'https://vote-board-game-web.vercel.app,https://*.vercel.app,http://localhost:3000';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('https://preview-test.vercel.app');

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://preview-test.vercel.app'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle preflight requests (OPTIONS)', async () => {
      const allowedOrigins = 'https://vote-board-game-web.vercel.app';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('https://vote-board-game-web.vercel.app');
      mockContext.req!.method = 'OPTIONS';

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://vote-board-game-web.vercel.app'
      );
      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
      expect(mockContext.header).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
      // Response オブジェクトが返されることを確認
      const result = await middleware(mockContext as Context, mockNext);
      expect(result).toBeInstanceOf(Response);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests from unauthorized origins', async () => {
      const allowedOrigins = 'https://vote-board-game-web.vercel.app';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('https://malicious-site.com');

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything()
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle requests without Origin header', async () => {
      const allowedOrigins = 'https://vote-board-game-web.vercel.app';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue(undefined);

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.anything()
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim whitespace from allowed origins', async () => {
      const allowedOrigins = ' https://example.com , https://*.vercel.app ';
      const middleware = corsMiddleware(allowedOrigins);

      (mockContext.req!.header as MockFn).mockReturnValue('https://example.com');

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com'
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('isOriginAllowed', () => {
    it('should return true for exact match', () => {
      const origin = 'https://vote-board-game-web.vercel.app';
      const allowedOrigins = ['https://vote-board-game-web.vercel.app'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it('should return true for wildcard match', () => {
      const origin = 'https://preview-abc123.vercel.app';
      const allowedOrigins = ['https://*.vercel.app'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it('should return true for multiple wildcard matches', () => {
      const origins = [
        'https://preview-abc.vercel.app',
        'https://preview-xyz.vercel.app',
        'https://my-app-test.vercel.app',
      ];
      const allowedOrigins = ['https://*.vercel.app'];

      origins.forEach((origin) => {
        expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
      });
    });

    it('should return false for non-matching origin', () => {
      const origin = 'https://malicious-site.com';
      const allowedOrigins = ['https://vote-board-game-web.vercel.app'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(false);
    });

    it('should return false for wildcard non-match', () => {
      const origin = 'https://example.com';
      const allowedOrigins = ['https://*.vercel.app'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(false);
    });

    it('should return true when origin matches one of multiple allowed origins', () => {
      const origin = 'http://localhost:3000';
      const allowedOrigins = [
        'https://vote-board-game-web.vercel.app',
        'https://*.vercel.app',
        'http://localhost:3000',
      ];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it('should handle special regex characters in origin', () => {
      const origin = 'https://app.example.com';
      const allowedOrigins = ['https://app.example.com'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });

    it('should not match partial domain with wildcard', () => {
      const origin = 'https://vercel.app.malicious.com';
      const allowedOrigins = ['https://*.vercel.app'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(false);
    });

    it('should match subdomain with wildcard', () => {
      const origin = 'https://sub.domain.vercel.app';
      const allowedOrigins = ['https://*.vercel.app'];

      expect(isOriginAllowed(origin, allowedOrigins)).toBe(true);
    });
  });
});
