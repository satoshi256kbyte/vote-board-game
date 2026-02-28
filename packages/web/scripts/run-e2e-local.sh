#!/bin/bash

# Script to run E2E tests locally against Vercel deployment
# Usage: ./scripts/run-e2e-local.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== E2E Test Local Runner ===${NC}"
echo ""

# Check if required environment variables are set
if [ -z "$BASE_URL" ]; then
  echo -e "${RED}Error: BASE_URL environment variable is not set${NC}"
  echo "Example: export BASE_URL=https://vote-board-game-web.vercel.app"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo -e "${RED}Error: NEXT_PUBLIC_API_URL environment variable is not set${NC}"
  echo "Example: export NEXT_PUBLIC_API_URL=https://your-api-url.execute-api.ap-northeast-1.amazonaws.com"
  exit 1
fi

if [ -z "$USER_POOL_ID" ]; then
  echo -e "${RED}Error: USER_POOL_ID environment variable is not set${NC}"
  echo "Example: export USER_POOL_ID=ap-northeast-1_xxxxxxxxx"
  exit 1
fi

if [ -z "$AWS_REGION" ]; then
  echo -e "${YELLOW}Warning: AWS_REGION not set, using default: ap-northeast-1${NC}"
  export AWS_REGION=ap-northeast-1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}Error: AWS credentials are not configured${NC}"
  echo "Please configure AWS credentials using 'aws configure' or environment variables"
  exit 1
fi

echo -e "${GREEN}Environment variables:${NC}"
echo "  BASE_URL: $BASE_URL"
echo "  NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "  USER_POOL_ID: $USER_POOL_ID"
echo "  AWS_REGION: $AWS_REGION"
echo ""

# Run E2E tests
echo -e "${GREEN}Running E2E tests...${NC}"
pnpm test:e2e

echo ""
echo -e "${GREEN}=== E2E tests completed ===${NC}"
