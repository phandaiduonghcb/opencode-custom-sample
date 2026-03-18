#!/bin/bash

# Authenticate AZ CLI
set -e

CLIENT_ID="${1}"
CLIENT_SECRET="${2}"
TENANT_ID="${3}"

echo "Authenticating with Azure..."
az login --service-principal \
    --allow-no-subscriptions \
    --username "$CLIENT_ID" \
    --password "$CLIENT_SECRET" \
    --tenant "$TENANT_ID" > /dev/null 2>&1

echo "Getting OAuth access token..."
TOKEN_JSON=$(az account get-access-token --scope "499b84ac-1321-427f-aa17-267ca6975798/.default")
ACCESS_TOKEN=$(echo "$TOKEN_JSON" | grep -o '"accessToken": "[^"]*' | sed 's/"accessToken": "//')