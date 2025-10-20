#!/bin/bash
set -e

# --- Configuration ---
DEFAULT_BASE_BRANCH="main"

# --- Argument parsing ---
TARGET_DIRECTORY=$1
BASE_BRANCH=${2:-$DEFAULT_BASE_BRANCH}

# --- Validation ---
if [ -z "$TARGET_DIRECTORY" ]; then
  echo "Error: No target directory specified." >&2
  echo "Usage: $0 <directory> [base_branch]" >&2
  exit 1
fi

# --- Logic ---
echo "Checking for changes in '$TARGET_DIRECTORY' against branch '$BASE_BRANCH'..." >&2

# Fetch the latest changes from the remote repository
# The --quiet flag suppresses verbose output
git fetch origin "$BASE_BRANCH" --quiet

# Check if there are any differences in the specified directory between the
# current state and the fetched branch.
# The `git diff` command returns a list of changed files.
# The `grep` command filters this list to see if any files in the
# target directory have changed.
if git diff --name-only "origin/${BASE_BRANCH}"...HEAD | grep -q "^${TARGET_DIRECTORY}/"; then
  echo "true"
else
  echo "false"
fi