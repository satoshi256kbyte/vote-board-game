# Bug Condition Exploration Test Documentation

## Test File

`packages/web/e2e/game/game-create-ci-bug.property.spec.ts`

## Purpose

This property-based test explores the bug condition where game creation fails in CI environment (GitHub Actions). The test encodes the EXPECTED behavior - when the bug exists, this test will FAIL. When the bug is fixed, this test will PASS.

## Bug Condition Being Tested

**Environment:** CI (GitHub Actions with Vercel deployment)

**Action:** Submit game creation form with AI side selection (BLACK or WHITE)

**Expected Behavior (Requirements 2.1, 2.2, 2.3, 2.4):**

1. API returns successful response (2xx status code)
2. Response contains valid gameId (UUID format)
3. Page redirects to `/games/{gameId}`
4. Game detail page loads successfully with heading and board

**Actual Behavior (Unfixed Code):**

- API fails, times out, or returns error response
- No redirect occurs, stays on `/games/new`
- E2E test times out after 30 seconds with "Target page, context or browser has been closed" error

## Test Implementation

### Property-Based Approach

The test uses `fast-check` to test both AI color choices (BLACK and WHITE) to ensure the bug is not color-specific:

```typescript
fc.constantFrom('BLACK', 'WHITE');
```

This generates 2 test runs (numRuns: 2), one for each color.

### Test Assertions

**Assertion 1: API Success (Requirements 2.1, 2.4)**

```typescript
expect(apiResponse!.status).toBeGreaterThanOrEqual(200);
expect(apiResponse!.status).toBeLessThan(300);
```

**Assertion 2: Valid Response Body (Requirement 2.2)**

```typescript
expect((apiResponse!.body as { gameId?: string }).gameId).toBeDefined();
expect((apiResponse!.body as { gameId?: string }).gameId).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
);
```

**Assertion 3: Redirect Execution (Requirements 2.1, 2.3)**

```typescript
await authenticatedPage.waitForURL(`**/games/${gameId}`, { timeout: TIMEOUTS.LONG });
```

**Assertion 4: Game Detail Page Load (Requirement 2.3)**

```typescript
await expect(heading).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
await expect(heading).toContainText('オセロ対局', { timeout: TIMEOUTS.MEDIUM });
await expect(board).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
```

### Debugging Features

The test includes comprehensive logging to help identify the root cause:

1. **Console Messages:** Captures all browser console output
2. **Page Errors:** Captures JavaScript errors from the page
3. **API Response Tracking:** Captures POST /api/games response details
4. **URL Tracking:** Logs current URL when redirect fails
5. **Page Content:** Logs page HTML when assertions fail

## Expected Test Outcome on Unfixed Code

**EXPECTED: TEST FAILURE**

The test will fail at one of these points:

1. **API Response Assertion Failure:**
   - `apiResponse` is null (API call never completed)
   - Status code is not 2xx (API returned error)
   - Response body missing or invalid gameId

2. **Redirect Assertion Failure:**
   - Timeout waiting for URL change to `/games/{gameId}`
   - Current URL remains `/games/new`

3. **Page Load Assertion Failure:**
   - Heading not visible
   - Heading doesn't contain "オセロ対局"
   - Board not visible

## Counterexample Documentation

When the test fails, it will provide a counterexample showing:

```
[Property Test] Testing game creation with AI side: BLACK (or WHITE)
[Browser Console] ... (console messages from page)
[Property Test] API Response: {
  "method": "POST",
  "url": "...",
  "status": ...,
  "statusText": "...",
  "body": ...
}
[Property Test] Redirect failed. Current URL: /games/new
[Property Test] Expected URL pattern: **/games/{gameId}
```

This counterexample will help identify the root cause:

- Environment variable misconfiguration (NEXT_PUBLIC_API_URL)
- CORS issues (API blocking Vercel domain)
- Authentication issues (missing token)
- Network timeout (slow Lambda cold start)
- DynamoDB eventual consistency (data not available)

## Running the Test

### In CI Environment (GitHub Actions)

```bash
# Triggered by workflow: .github/workflows/e2e-game.yml
pnpm --filter @vote-board-game/web test:e2e:game
```

The test will run automatically in the CI environment with:

- BASE_URL: Vercel deployment URL
- NEXT_PUBLIC_API_URL: API Gateway URL from CloudFormation
- AWS credentials configured
- Test user credentials from secrets

### Locally (Not Recommended)

The test requires:

- Frontend running at BASE_URL (Vercel deployment)
- API deployed to AWS
- AWS credentials configured
- Environment variables set in `.env.test`

Local execution is not recommended as it requires full AWS infrastructure deployment.

## Next Steps After Test Execution

1. **Review GitHub Actions logs** for the test execution
2. **Analyze the counterexample** to identify root cause
3. **Implement Phase 1 fix** (add debug logging) based on findings
4. **Iterate** through Phases 2-6 as needed
5. **Re-run this test** after fix to verify it passes

## Success Criteria

This task is complete when:

- ✅ Test file is created
- ✅ Test encodes expected behavior (Requirements 2.1, 2.2, 2.3, 2.4)
- ✅ Test includes comprehensive debugging
- ✅ Test documentation explains expected failure
- ⏳ Test execution in CI (will be done in next iteration)
- ⏳ Counterexample documentation (will be captured from CI logs)
