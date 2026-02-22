export {
  createAuthMiddleware,
  extractBearerToken,
  getKidFromToken,
  buildJwksUrl,
} from './auth-middleware.js';
export type { AuthVariables, AuthMiddlewareConfig, CognitoAccessTokenPayload } from './types.js';
