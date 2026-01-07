#!/bin/bash

# Redeploy Script for Vercel
# This script helps trigger a redeployment of a specific commit to Vercel

set -e

COMMIT_HASH="${1:-}"
ENVIRONMENT="${2:-production}"

if [ -z "$COMMIT_HASH" ]; then
  echo "Usage: $0 <commit_hash> [environment]"
  echo "  commit_hash: The git commit hash to redeploy (e.g., 940af1c8)"
  echo "  environment: Target environment (production or preview, default: production)"
  echo ""
  echo "Example: $0 940af1c8 production"
  exit 1
fi

# Validate commit hash exists
if ! git rev-parse --verify "$COMMIT_HASH" >/dev/null 2>&1; then
  echo "Error: Commit hash '$COMMIT_HASH' not found in repository"
  exit 1
fi

FULL_HASH=$(git rev-parse "$COMMIT_HASH")

echo "======================================"
echo "Vercel Redeployment Helper"
echo "======================================"
echo "Commit Hash: $COMMIT_HASH ($FULL_HASH)"
echo "Environment: $ENVIRONMENT"
echo "======================================"
echo ""

# Check if gh CLI is available
if command -v gh &> /dev/null; then
  echo "Triggering GitHub Actions workflow to redeploy..."
  echo ""
  
  gh workflow run deploy.yml \
    -f commit_hash="$COMMIT_HASH" \
    -f environment="$ENVIRONMENT"
  
  echo ""
  echo "✓ Workflow dispatch triggered successfully!"
  echo "  The deployment will be processed by Vercel CI/CD"
  echo ""
  echo "To view the workflow run:"
  echo "  gh run list --workflow=deploy.yml"
  echo ""
  echo "To view Vercel deployments:"
  echo "  Visit: https://vercel.com/dashboard"
else
  echo "GitHub CLI (gh) is not installed."
  echo ""
  echo "To redeploy manually:"
  # Extract repository name from git remote URL (removes github.com[:/] prefix and .git suffix)
  REPO_PATH=$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
  echo "1. Go to: https://github.com/${REPO_PATH}/actions"
  echo "2. Select 'Deploy to Vercel' workflow"
  echo "3. Click 'Run workflow'"
  echo "4. Enter commit hash: $COMMIT_HASH"
  echo "5. Select environment: $ENVIRONMENT"
  echo "6. Click 'Run workflow'"
  echo ""
  echo "Alternatively, install GitHub CLI:"
  echo "  https://cli.github.com/"
fi
