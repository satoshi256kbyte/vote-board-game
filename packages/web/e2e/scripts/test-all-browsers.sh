#!/bin/bash
# Cross-browser testing script for E2E tests
# This script runs tests on all three browsers and generates individual reports

set -e

echo "=========================================="
echo "Cross-Browser E2E Testing"
echo "=========================================="
echo ""

# Check if BASE_URL is set
if [ -z "$BASE_URL" ]; then
  echo "Error: BASE_URL environment variable is not set"
  echo "Please set BASE_URL before running tests"
  echo "Example: export BASE_URL=http://localhost:3000"
  exit 1
fi

echo "Testing against: $BASE_URL"
echo ""

# Create reports directory
mkdir -p playwright-report/chromium
mkdir -p playwright-report/firefox
mkdir -p playwright-report/webkit

# Test Chromium
echo "=========================================="
echo "Testing on Chromium..."
echo "=========================================="
pnpm exec playwright test --project=chromium --reporter=html --reporter=list || CHROMIUM_FAILED=1
if [ -z "$CHROMIUM_FAILED" ]; then
  echo "✓ Chromium tests passed"
else
  echo "✗ Chromium tests failed"
fi
echo ""

# Test Firefox
echo "=========================================="
echo "Testing on Firefox..."
echo "=========================================="
pnpm exec playwright test --project=firefox --reporter=html --reporter=list || FIREFOX_FAILED=1
if [ -z "$FIREFOX_FAILED" ]; then
  echo "✓ Firefox tests passed"
else
  echo "✗ Firefox tests failed"
fi
echo ""

# Test WebKit
echo "=========================================="
echo "Testing on WebKit..."
echo "=========================================="
pnpm exec playwright test --project=webkit --reporter=html --reporter=list || WEBKIT_FAILED=1
if [ -z "$WEBKIT_FAILED" ]; then
  echo "✓ WebKit tests passed"
else
  echo "✗ WebKit tests failed"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
if [ -z "$CHROMIUM_FAILED" ]; then
  echo "✓ Chromium: PASSED"
else
  echo "✗ Chromium: FAILED"
fi

if [ -z "$FIREFOX_FAILED" ]; then
  echo "✓ Firefox: PASSED"
else
  echo "✗ Firefox: FAILED"
fi

if [ -z "$WEBKIT_FAILED" ]; then
  echo "✓ WebKit: PASSED"
else
  echo "✗ WebKit: FAILED"
fi
echo ""

# Exit with error if any browser failed
if [ -n "$CHROMIUM_FAILED" ] || [ -n "$FIREFOX_FAILED" ] || [ -n "$WEBKIT_FAILED" ]; then
  echo "Some tests failed. Check the reports for details."
  exit 1
fi

echo "All browser tests passed!"
exit 0
