# E2E Test Scripts

## Local E2E Test Runner

`run-e2e-local.sh` allows you to run E2E tests locally against a deployed Vercel environment.

### Prerequisites

1. AWS credentials configured (via `aws configure` or environment variables)
2. Access to the development/staging environment

### Usage

```bash
# Set required environment variables
export BASE_URL=https://vote-board-game-web.vercel.app
export NEXT_PUBLIC_API_URL=https://your-api-url.execute-api.ap-northeast-1.amazonaws.com
export USER_POOL_ID=ap-northeast-1_xxxxxxxxx
export AWS_REGION=ap-northeast-1  # Optional, defaults to ap-northeast-1

# Run the script
cd packages/web
./scripts/run-e2e-local.sh
```

### Getting Environment Variables

You can get the required environment variables from:

1. **BASE_URL**: Vercel deployment URL (from Vercel dashboard or GitHub Actions)
2. **NEXT_PUBLIC_API_URL**: API Gateway URL (from CDK outputs or GitHub Actions)
3. **USER_POOL_ID**: Cognito User Pool ID (from CDK outputs or GitHub Actions)

To get values from GitHub Actions:

- Go to the latest successful CD workflow run
- Check the "Deploy to AWS" step outputs
- Look for `api-url` and `user-pool-id` in the outputs

### Troubleshooting

If tests fail:

1. Check that all environment variables are set correctly
2. Verify AWS credentials are valid: `aws sts get-caller-identity`
3. Ensure the Vercel deployment is accessible
4. Check the test output for detailed error messages
5. Review the Playwright report: `pnpm playwright:report`
