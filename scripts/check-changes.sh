#!/bin/bash
set -e

DIRECTORY=$1

# Fetch the main branch to ensure we have the latest changes
git fetch origin main

# Compare the current branch with the main branch
if git diff --name-only origin/main...HEAD | grep -q "^${DIRECTORY}/"; then
  echo "true"
else
  echo "false"
fi
