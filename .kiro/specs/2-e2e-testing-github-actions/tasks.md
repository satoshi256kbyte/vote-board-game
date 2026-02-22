# Implementation Plan: E2E Testing GitHub Actions Integration

## Overview

This implementation adds Playwright E2E testing to the GitHub Actions CD pipeline for the Development environment. The focus is on basic smoke tests to verify application functionality after deployment, not comprehensive testing.

## Tasks

- [-] 1. Setup Playwright in web package
  - Install @playwright/test as dev dependency in packages/web
  - Create playwright.config.ts with Chromium browser configuration
  - Configure BASE_URL from environment variable with validation
  - Set timeout to 30 seconds for tests
  - Configure test output directories (playwright-report, test-results)
  - Configure screenshot capture on failure only
  - Configure trace recording on first retry
  - Set retries to 2 in CI environment, 0 locally
  - Set workers to 1 in CI environment for stability
  - Update .gitignore to exclude Playwright artifacts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [-] 1.1 Write unit tests for Playwright configuration
  - Create playwright.config.test.ts
  - Test BASE_URL environment variable validation
  - Test CI environment detection for headless mode
  - Test retry and worker configuration based on CI environment
  - _Requirements: 1.4, 4.3, 4.4_

- [x] 2. Implement smoke tests
  - [x] 2.1 Create e2e directory structure and smoke test file
    - Create packages/web/e2e/ directory
    - Create packages/web/e2e/smoke.spec.ts
    - Import Playwright test utilities
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Implement homepage load test
    - Test that homepage returns 200 status code
    - Verify page loads within timeout
    - _Requirements: 2.1_

  - [x] 2.3 Implement page title test
    - Test that homepage has a non-empty title
    - Verify title exists and has content
    - _Requirements: 2.2_

  - [x] 2.4 Implement interactive elements test
    - Test that at least one button or link is visible
    - Count interactive elements (buttons + links)
    - Verify count is greater than 0
    - _Requirements: 2.3_

- [x] 3. Add npm scripts for E2E testing
  - Add "test:e2e" script for headless test execution
  - Add "test:e2e:headed" script for headed mode (local development)
  - Add "test:e2e:ui" script for Playwright UI mode (debugging)
  - Add "test:e2e:report" script to show HTML report
  - Add "playwright:install" script to install Chromium with dependencies
  - _Requirements: 4.1, 4.2_

- [ ] 4. Integrate E2E tests into CD pipeline
  - [x] 4.1 Modify deploy-reusable.yml to output CloudFront URL
    - Add cloudfront-url to job outputs
    - Calculate CloudFront URL from distribution ID
    - Export cloudfront-url in Extract CDK Outputs step
    - _Requirements: 3.2_

  - [x] 4.2 Create E2E test job in cd-development.yml
    - Add e2e-tests job that depends on deploy-development
    - Configure job to run only on deployment success
    - Add checkout, pnpm setup, and Node.js setup steps
    - Install dependencies with frozen lockfile
    - _Requirements: 3.1, 3.7_

  - [x] 4.3 Add Playwright browser caching
    - Get Playwright version from package
    - Cache Playwright browsers by version and OS
    - Install browsers only if cache miss
    - Use cache path ~/.cache/ms-playwright
    - _Requirements: 5.1, 5.2_

  - [x] 4.4 Add E2E test execution step
    - Get CloudFront URL from deploy job outputs
    - Validate CloudFront URL is not empty
    - Run E2E tests with BASE_URL environment variable
    - Set BASE_URL to CloudFront URL
    - _Requirements: 3.2, 3.3, 4.4_

  - [x] 4.5 Add test results artifact upload
    - Upload playwright-report as artifact (always run)
    - Upload test-results as artifact on failure only
    - Set artifact retention to 7 days
    - Name artifacts appropriately (playwright-report, playwright-failures)
    - _Requirements: 3.4, 3.6, 6.1, 6.2, 6.3, 6.4_

  - [x] 4.6 Add deployment summary with test results
    - Add E2E test results section to GITHUB_STEP_SUMMARY
    - Show success/failure status with emoji
    - Include test URL (CloudFront URL)
    - Link to test report artifact on failure
    - Run summary step always (success or failure)
    - _Requirements: 6.5_

  - [~] 4.7 Ensure E2E job fails workflow on test failure
    - Verify E2E test failures cause job failure
    - Confirm workflow status reflects E2E test results
    - _Requirements: 3.5_

- [~] 5. Checkpoint - Verify E2E integration
  - Ensure all tests pass locally with BASE_URL set
  - Verify Playwright configuration loads correctly
  - Test that npm scripts work as expected
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The checkpoint ensures incremental validation
- E2E tests run only for Development environment deployments
- Playwright browsers are cached to speed up CI execution
- Test artifacts are retained for 7 days for debugging
- Implementation uses TypeScript throughout
