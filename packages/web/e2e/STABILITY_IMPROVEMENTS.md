# E2E Test Stability Improvements

## Overview

This document describes the stability improvements implemented for the E2E test suite to ensure reliable and consistent test execution.

**Requirements:** Requirement 10 (Test Reliability and Stability)

## Implemented Improvements

### 1. Wait Utilities (`helpers/wait-utils.ts`)

Created a comprehensive set of wait utilities with retry logic and explicit waits:

#### Timeout Constants

```typescript
TIMEOUTS = {
  SHORT: 5000, // 5 seconds - for fast operations
  MEDIUM: 10000, // 10 seconds - for standard operations
  LONG: 15000, // 15 seconds - for slow operations
  NAVIGATION: 30000, // 30 seconds - for page navigation
};
```

#### Retry Configuration

```typescript
RETRY_CONFIG = {
  MAX_ATTEMPTS: 3, // Maximum retry attempts for failed assertions
  DELAY_MS: 1000, // Delay between retry attempts
};
```

#### Key Functions

- **`waitForVisible(locator, options)`**: Wait for element visibility with retry logic
- **`waitForNetworkIdle(page, urlPattern, options)`**: Wait for network requests to complete
- **`waitForLoadingComplete(page, loadingSelector, options)`**: Wait for loading indicators to disappear
- **`retryAssertion(assertion, options)`**: Retry failed assertions up to 3 times
- **`waitForDynamicContent(page, contentSelector, options)`**: Wait for dynamic content to load
- **`waitForStable(locator, options)`**: Wait for element to be stable (not animating)
- **`waitForApiResponse(page, urlPattern, options)`**: Wait for specific API responses
- **`waitForNavigation(page, url, options)`**: Wait for navigation with retry logic

### 2. Page Object Improvements

All page objects have been updated with:

#### Explicit Waits

- All element interactions now wait for visibility before acting
- Proper timeout values based on operation type
- Network idle waits after navigation

#### Network Request Waits

- Wait for API responses after form submissions
- Wait for authentication API calls
- Wait for data loading API calls

#### Retry Logic

- All assertions wrapped in `retryAssertion()` for up to 3 attempts
- Automatic retry on transient failures
- Configurable delay between retries

#### Stable Selectors

- All selectors use `data-testid` attributes
- No reliance on CSS classes or DOM structure
- Consistent naming convention: `{component}-{element}-{type}`

#### Loading State Waits

- Wait for loading indicators to disappear
- Wait for dynamic content to load
- Wait for page transitions to complete

### 3. Updated Page Objects

#### LoginPage

- Network idle wait after navigation
- Explicit visibility checks for all inputs
- Wait for auth API response after login
- Retry logic for error messages and redirects

#### VotingPage

- Loading state completion waits
- API response waits for vote submission
- Retry logic for candidate visibility
- Dynamic content loading waits

#### GameDetailPage

- Dynamic content waits for board state
- Retry logic for all game elements
- Loading completion waits

#### GameListPage

- Dynamic content waits for game cards
- Retry logic for game list assertions
- Proper wait for game data loading

#### RegistrationPage

- API response waits for registration
- Navigation waits with retry
- Explicit visibility checks

#### ProfilePage

- Loading state waits
- API response waits for profile updates
- Dynamic content waits for profile data

#### PasswordResetPage

- API response waits for reset requests
- Navigation waits with retry
- Explicit visibility checks for all steps

## Benefits

### 1. Improved Reliability

- Tests are less likely to fail due to timing issues
- Automatic retry reduces flakiness
- Explicit waits prevent race conditions

### 2. Better Error Messages

- Clear timeout messages when elements don't appear
- Retry attempts logged for debugging
- Network request failures clearly identified

### 3. Consistent Behavior

- All page objects follow the same patterns
- Predictable timeout values
- Standardized retry logic

### 4. Maintainability

- Centralized wait utilities
- Easy to adjust timeout values
- Reusable retry logic

## Usage Examples

### Basic Element Interaction

```typescript
// Before
await page.getByTestId('button').click();

// After
const button = page.getByTestId('button');
await expect(button).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
await button.click();
```

### Form Submission with API Wait

```typescript
// Before
await page.getByTestId('submit-button').click();

// After
await page.getByTestId('submit-button').click();
await waitForApiResponse(page, /\/api\/submit/, { timeout: TIMEOUTS.LONG });
```

### Assertion with Retry

```typescript
// Before
await expect(element).toBeVisible();

// After
await retryAssertion(async () => {
  await expect(element).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
});
```

### Navigation with Retry

```typescript
// Before
await page.waitForURL('/games', { timeout: 10000 });

// After
await waitForNavigation(page, '/games', { timeout: TIMEOUTS.NAVIGATION });
```

## Testing the Improvements

### Run Unit Tests

```bash
pnpm test e2e/helpers/wait-utils.test.ts
```

### Run E2E Tests

```bash
# Single run
pnpm test:e2e

# Run 3 times to verify stability
pnpm test:e2e && pnpm test:e2e && pnpm test:e2e
```

### Check for Flaky Tests

```bash
# Run tests multiple times in parallel
pnpm test:e2e --repeat-each=3
```

## Best Practices

### 1. Always Use Explicit Waits

- Never rely on implicit waits
- Always specify timeout values
- Use appropriate timeout constants

### 2. Wait for Network Requests

- Wait for API responses after actions
- Use `waitForNetworkIdle()` after navigation
- Use `waitForApiResponse()` for specific endpoints

### 3. Use Retry Logic for Assertions

- Wrap assertions in `retryAssertion()`
- Use for dynamic content checks
- Use for state verification

### 4. Use Stable Selectors

- Always use `data-testid` attributes
- Never use CSS classes for selectors
- Follow naming convention

### 5. Wait for Loading States

- Use `waitForLoadingComplete()` after navigation
- Wait for loading indicators to disappear
- Use `waitForDynamicContent()` for lazy-loaded content

## Troubleshooting

### Test Times Out

- Check if timeout value is appropriate
- Verify element selector is correct
- Check if loading indicator is blocking element

### Test is Flaky

- Add retry logic to assertion
- Increase timeout value
- Add network idle wait

### Element Not Found

- Verify `data-testid` attribute exists
- Check if element is in viewport
- Verify element is not hidden by loading state

## Future Improvements

1. Add visual regression testing
2. Implement custom Playwright matchers
3. Add performance monitoring
4. Create test data factories
5. Implement parallel test execution optimization

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Requirement 10: Test Reliability and Stability](../../../.kiro/specs/16-e2e-testing-main-flows/requirements.md#要件10-テストの信頼性と安定性)
- [Design Document](../../../.kiro/specs/16-e2e-testing-main-flows/design.md)
