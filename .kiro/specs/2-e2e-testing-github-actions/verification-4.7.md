# Task 4.7 Verification: E2E Job Fails Workflow on Test Failure

## Requirement

**要件 3.5**: E2Eテストが失敗した場合、CDパイプラインはワークフローを失敗させること

(When E2E tests fail, the CD pipeline should fail the workflow)

## Current Configuration Analysis

### E2E Test Job Configuration

The `e2e-tests` job in `.github/workflows/cd-development.yml` has the following configuration:

```yaml
e2e-tests:
  needs: deploy-development
  runs-on: ubuntu-latest
  if: success()
```

**Key Points:**

- ✅ No `continue-on-error: true` at job level
- ✅ Depends on `deploy-development` job success
- ✅ Only runs if previous job succeeds (`if: success()`)

### E2E Test Execution Step

```yaml
- name: Run E2E tests
  run: pnpm --filter @vote-board-game/web test:e2e
  env:
    BASE_URL: ${{ steps.cloudfront-url.outputs.url }}
```

**Key Points:**

- ✅ No `continue-on-error: true` at step level
- ✅ No error suppression (no `|| true` or similar)
- ✅ Uses standard `run` command which fails on non-zero exit code

### Artifact Upload Steps

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  # ...

- name: Upload failure artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  # ...

- name: Update deployment summary
  if: always()
  run: |
    # ...
```

**Key Points:**

- ✅ Artifact uploads use `if: always()` or `if: failure()` - they run even when tests fail
- ✅ These steps don't affect job failure status
- ✅ Summary step runs always but doesn't suppress the failure

## Verification of Correct Behavior

### Default GitHub Actions Behavior

By default, GitHub Actions follows this behavior:

1. **Step Failure**: When a `run` command exits with non-zero code, the step fails
2. **Job Failure**: When a step fails (and doesn't have `continue-on-error: true`), the job fails
3. **Workflow Failure**: When a job fails, the workflow is marked as failed

### Playwright Test Behavior

Playwright's `playwright test` command:

- Returns exit code `0` when all tests pass
- Returns exit code `1` when any test fails
- This is the standard behavior for test runners

### Configuration Verification

The current configuration is **CORRECT** because:

1. ✅ **No error suppression**: The "Run E2E tests" step will fail if tests fail
2. ✅ **Job failure propagation**: The job will fail if the test step fails
3. ✅ **Workflow failure**: The workflow will be marked as failed when the job fails
4. ✅ **Artifact preservation**: Test results and failure artifacts are still uploaded even on failure (using `if: always()` and `if: failure()`)
5. ✅ **Summary generation**: Deployment summary is still generated even on failure (using `if: always()`)

## Test Scenarios

### Scenario 1: All Tests Pass

- ✅ E2E test step succeeds (exit code 0)
- ✅ Job succeeds
- ✅ Workflow succeeds
- ✅ Test results uploaded
- ✅ Summary shows success

### Scenario 2: One or More Tests Fail

- ✅ E2E test step fails (exit code 1)
- ✅ Job fails
- ✅ Workflow fails ⚠️ **This is the required behavior**
- ✅ Test results uploaded (due to `if: always()`)
- ✅ Failure artifacts uploaded (due to `if: failure()`)
- ✅ Summary shows failure (due to `if: always()`)

### Scenario 3: Test Execution Error (e.g., BASE_URL not set)

- ✅ E2E test step fails (exit code 1)
- ✅ Job fails
- ✅ Workflow fails
- ✅ Error visible in job logs

## Conclusion

**The current configuration is CORRECT and meets requirement 3.5.**

No changes are needed because:

- The default GitHub Actions behavior already ensures test failures cause workflow failures
- There is no error suppression in the configuration
- Artifact uploads and summary generation are properly configured to run even on failure
- The workflow will correctly report failure status when E2E tests fail

## Recommendation

This task is a **verification task** rather than an implementation task. The requirement is already satisfied by the default behavior of GitHub Actions and the current workflow configuration.

To fully verify this behavior in a real environment, one would need to:

1. Temporarily introduce a failing test
2. Push to a branch and trigger the workflow
3. Verify the workflow fails
4. Verify artifacts are still uploaded
5. Revert the failing test

However, based on the configuration analysis, we can confirm with high confidence that the behavior is correct.
