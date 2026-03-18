#!/bin/bash

# Create Pull Request
# Usage: create-pr.sh <REPO_NAME> <SOURCE_BRANCH> <TARGET_BRANCH> <TITLE> [DESCRIPTION]

set -e

REPO_NAME="${1}"
SOURCE_BRANCH="${2}"
TARGET_BRANCH="${3}"
TITLE="${4}"
DESCRIPTION="${5:-}"

if [ -z "$REPO_NAME" ] || [ -z "$SOURCE_BRANCH" ] || [ -z "$TARGET_BRANCH" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 <REPO_NAME> <SOURCE_BRANCH> <TARGET_BRANCH> <TITLE> [DESCRIPTION]"
    echo "Example: $0 web-app ai/fix-vuln dev 'Fix vulnerabilities' 'Description here'"
    exit 1
fi

echo "Checking for existing PRs..."
EXISTING_PR=$(az repos pr list --repository "$REPO_NAME" --source-branch "$SOURCE_BRANCH" --project "$REPO_NAME" 2>/dev/null | python3 -c "
import json
import sys
prs = json.load(sys.stdin)
if prs:
    print(prs[0]['pullRequestId'])
" 2>/dev/null || echo "")

if [ -n "$EXISTING_PR" ]; then
    echo "PR already exists: #$EXISTING_PR"
    echo "$EXISTING_PR"
    exit 0
fi

echo "Creating pull request..."
if [ -n "$DESCRIPTION" ]; then
    PR_JSON=$(az repos pr create \
        --repository "$REPO_NAME" \
        --source-branch "$SOURCE_BRANCH" \
        --target-branch "$TARGET_BRANCH" \
        --title "$TITLE" \
        --description "$DESCRIPTION" \
        --project "$REPO_NAME")
else
    PR_JSON=$(az repos pr create \
        --repository "$REPO_NAME" \
        --source-branch "$SOURCE_BRANCH" \
        --target-branch "$TARGET_BRANCH" \
        --title "$TITLE" \
        --project "$REPO_NAME")
fi

PR_ID=$(echo "$PR_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['pullRequestId'])")
echo "PR created: #$PR_ID"
echo "$PR_ID"
