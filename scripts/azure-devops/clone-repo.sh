#!/bin/bash

# Clone Azure DevOps Repository
# Usage: clone-repo.sh <CLIENT_ID> <CLIENT_SECRET> <TENANT_ID> <REPO_URL> [WORKSPACE_DIR]

set -e

CLIENT_ID="${1}"
CLIENT_SECRET="${2}"
TENANT_ID="${3}"
REPO_URL="${4}"
WORKSPACE_DIR="${5:-.}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$TENANT_ID" ] || [ -z "$REPO_URL" ]; then
    echo "Usage: $0 <CLIENT_ID> <CLIENT_SECRET> <TENANT_ID> <REPO_URL> [WORKSPACE_DIR]"
    echo "Example: $0 <id> <secret> <tenant> 'https://dev.azure.com/org/project/_git/repo' /workspace"
    exit 1
fi

echo "Authenticating with Azure..."
az login --service-principal \
    --allow-no-subscriptions \
    --username "$CLIENT_ID" \
    --password "$CLIENT_SECRET" \
    --tenant "$TENANT_ID" > /dev/null 2>&1

echo "Getting OAuth access token..."
TOKEN_JSON=$(az account get-access-token --scope "499b84ac-1321-427f-aa17-267ca6975798/.default")
ACCESS_TOKEN=$(echo "$TOKEN_JSON" | grep -o '"accessToken": "[^"]*' | sed 's/"accessToken": "//')

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Error: Could not extract access token"
    exit 1
fi

REPO_NAME=$(echo "$REPO_URL" | sed 's|.*/||' | sed 's|\.git||')
REPO_DIR="$WORKSPACE_DIR/$REPO_NAME"

if [ -d "$REPO_DIR" ]; then
    echo "Repository already exists at $REPO_DIR, using existing..."
    cd "$REPO_DIR"
    echo "$REPO_DIR"
    exit 0
fi

echo "Cloning repository to $REPO_DIR..."
REPO_URL_CLEAN=$(echo "$REPO_URL" | sed 's|https://||')
git clone "https://${ACCESS_TOKEN}@${REPO_URL_CLEAN}" "$REPO_DIR"

echo "$REPO_DIR"
