# Local E2E Testing Guide

This guide helps you run E2E tests locally against the deployed Vercel environment to debug test failures.

## Quick Start

### 1. Get Environment Variables from GitHub Actions

Go to the latest successful CD workflow run:

- Navigate to: https://github.com/satoshi256kbytes/vote-board-game/actions
- Click on the latest "CD (Development)" workflow run
- Click on "Deploy to AWS" job
- Expand the "Deploy to AWS" step
- Look for the outputs section at the end

You should see something like:

```
Outputs:
  api-url = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
  user-pool-id = ap-northeast-1_xxxxxxxxx
```

Also get the Vercel URL from the repository variables:

- Go to: https://github.com/satoshi256kbytes/vote-board-game/settings/variables/actions
- Look for `VERCEL_URL` variable

### 2. Configure AWS Credentials

Make sure you have AWS credentials configured:

```bash
aws sts get-caller-identity
```

If not configured, run:

```bash
aws configure
```

### 3. Set Environment Variables

```bash
# From GitHub Actions outputs
export BASE_URL=https://vote-board-game-web.vercel.app
export NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
export USER_POOL_ID=ap-northeast-1_xxxxxxxxx
export AWS_REGION=ap-northeast-1
```

### 4. Run E2E Tests

```bash
cd packages/web
./scripts/run-e2e-local.sh
```

## Debugging Login Test Failures

The current issue is that the login test succeeds in calling the API (200 status) but doesn't redirect to the home page.

### What the Test Does

1. Creates a test user in Cognito
2. Navigates to `/login` page
3. Fills in email and password
4. Clicks the login button
5. Waits for the login API call to complete
6. Expects to be redirected to `/` or `/games`

### Current Logging

The test now logs:

- Console messages and errors from the browser
- Network requests (especially `/auth/login`)
- Navigation events (page transitions)
- localStorage state (tokens and user data)

### What to Look For

When you run the test locally, check:

1. **API Response**: Does the login API return 200?
2. **Tokens Saved**: Are `accessToken`, `refreshToken`, and `user` saved to localStorage?
3. **Navigation Events**: Does the page navigate after login?
4. **Console Errors**: Are there any JavaScript errors in the browser console?

### Example Output

```
[Test] Attempting login with email: test-xxxxx@example.com
[Test] Current URL after login: https://vote-board-game-web.vercel.app/login
[Test] Navigation events: ["Navigated to: https://vote-board-game-web.vercel.app/login"]
[Test] API requests: [{"url":"https://xxx.execute-api.ap-northeast-1.amazonaws.com/auth/login","status":200,"method":"POST"}]
[Test] Console messages: [...]
[Test] Console errors: []
[Test] localStorage state: {"accessToken":"eyJ...","refreshToken":"eyJ...","user":"{...}","allKeys":["accessToken","refreshToken","user"]}
[Test] Login API succeeded with status 200
[Test] Tokens and user data successfully saved to localStorage
```

### Possible Issues

1. **Router.push() not working**: Next.js router might not be triggering navigation
2. **AuthContext not updating**: User state might not be set correctly
3. **Timing issue**: Navigation might happen but test doesn't wait long enough
4. **Client-side hydration**: Static export might have issues with client-side navigation

### Next Steps

Based on the local test output, we can:

1. Add more logging to the login form component
2. Check if AuthContext is properly initialized
3. Verify that router.push() is being called
4. Test if manual navigation works after login
