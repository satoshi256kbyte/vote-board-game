// Setup environment variables for all tests
// This file is loaded before any test files are executed
process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-northeast-1_TestPool';
process.env.ICON_BUCKET_NAME = process.env.ICON_BUCKET_NAME || 'test-icon-bucket';
process.env.CDN_DOMAIN = process.env.CDN_DOMAIN || 'test-cdn.example.com';
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://*.vercel.app';
