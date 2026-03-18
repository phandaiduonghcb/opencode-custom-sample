#!/bin/bash

# Trigger and Monitor Pipeline with Enhanced Error Reporting
# Usage: trigger-pipeline.sh <PIPELINE_NAME> <PROJECT> <BRANCH> [POLL_INTERVAL] [MAX_ATTEMPTS]

set -e

PIPELINE_NAME="${1}"
PROJECT="${2}"
BRANCH="${3}"
POLL_INTERVAL="${4:-30}"
MAX_ATTEMPTS="${5:-10}"

if [ -z "$PIPELINE_NAME" ] || [ -z "$PROJECT" ] || [ -z "$BRANCH" ]; then
    echo "Usage: $0 <PIPELINE_NAME> <PROJECT> <BRANCH> [POLL_INTERVAL] [MAX_ATTEMPTS]"
    echo "Example: $0 web-app web-app ai/fix-vuln 30 10"
    exit 1
fi

echo "=========================================="
echo "Triggering pipeline: $PIPELINE_NAME"
echo "Project: $PROJECT"
echo "Branch: $BRANCH"
echo "=========================================="

# Trigger pipeline
BUILD_JSON=$(az pipelines run \
    --name "$PIPELINE_NAME" \
    --project "$PROJECT" \
    --branch "$BRANCH")

BUILD_ID=$(echo "$BUILD_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
BUILD_NUMBER=$(echo "$BUILD_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('buildNumber', 'N/A'))")

echo "✓ Build triggered successfully"
echo "  Build ID: $BUILD_ID"
echo "  Build Number: $BUILD_NUMBER"
echo ""

# Get pipeline ID for reference
PIPELINE_ID=$(az pipelines list \
    --query "[?name=='$PIPELINE_NAME'].id | [0]" \
    -o tsv)
echo "  Pipeline ID: $PIPELINE_ID"
echo ""

# Monitor build status
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking build status (attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS)..."
    sleep "$POLL_INTERVAL"
    
    BUILD_INFO=$(az pipelines build show \
        --id "$BUILD_ID" \
        --project "$PROJECT")
    
    BUILD_STATUS=$(echo "$BUILD_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
    
    echo "  Status: $BUILD_STATUS"
    
    if [ "$BUILD_STATUS" == "completed" ]; then
        BUILD_RESULT=$(echo "$BUILD_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['result'])")
        
        echo ""
        echo "=========================================="
        echo "Build Completed"
        echo "=========================================="
        echo "  Build ID: $BUILD_ID"
        echo "  Build Number: $BUILD_NUMBER"
        echo "  Result: $BUILD_RESULT"
        echo ""
        
        if [ "$BUILD_RESULT" == "succeeded" ]; then
            echo "✅ Build #$BUILD_ID SUCCEEDED"
            echo ""
            exit 0
        else
            echo "❌ Build #$BUILD_ID FAILED"
            echo ""
            echo "=========================================="
            echo "Retrieving Error Details..."
            echo "=========================================="
            
            # Get build timeline to find failed steps
            echo ""
            echo "Failed Steps:"
            echo "----------------------------------------"
            
            TIMELINE_JSON=$(az devops invoke \
                --area build \
                --resource timeline \
                --route-parameters project="$PROJECT" buildId="$BUILD_ID" \
                --api-version 7.1-preview)
            
            # Extract failed steps with their log IDs
            FAILED_STEPS=$(echo "$TIMELINE_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
failed = []
for record in data.get('records', []):
    if record.get('result') == 'failed' and record.get('type') == 'Task':
        log_info = record.get('log')
        step_info = {
            'name': record.get('name', 'Unknown'),
            'type': record.get('type', 'Unknown'),
            'logId': log_info.get('id') if log_info else None,
            'errorCount': record.get('errorCount', 0),
            'warningCount': record.get('warningCount', 0)
        }
        # Get first issue message if available
        issues = record.get('issues', [])
        if issues:
            step_info['firstError'] = issues[0].get('message', '')
        failed.append(step_info)

for idx, step in enumerate(failed, 1):
    print(f\"\n{idx}. {step['name']} ({step['type']})\")
    if step['logId']:
        print(f\"   Log ID: {step['logId']}\")
        print(f\"   ---LOG_ID:{step['logId']}---\")
    else:
        print(f\"   Log ID: N/A\")
    print(f\"   Errors: {step['errorCount']}, Warnings: {step['warningCount']}\")
    if 'firstError' in step:
        print(f\"   First Error: {step['firstError']}\")
")
            
            echo "$FAILED_STEPS"
            
            # Extract log IDs and fetch logs (Windows compatible)
            # Parse log IDs from the output
            LOG_IDS=$(echo "$FAILED_STEPS" | python3 -c "
import sys
import re
content = sys.stdin.read()
log_ids = re.findall(r'LOG_ID:(\d+)', content)
print(' '.join(log_ids))
" || true)
            
            if [ -n "$LOG_IDS" ]; then
                echo ""
                echo "=========================================="
                echo "Failed Step Logs:"
                echo "=========================================="
                
                for LOG_ID in $LOG_IDS; do
                    echo ""
                    echo "----------------------------------------"
                    echo "Log ID: $LOG_ID"
                    echo "----------------------------------------"
                    
                    LOG_CONTENT=$(az devops invoke \
                        --area build \
                        --resource logs \
                        --route-parameters project="$PROJECT" buildId="$BUILD_ID" logId="$LOG_ID" \
                        --api-version 7.1-preview \
                        --query value \
                        -o tsv 2>/dev/null || echo "Failed to retrieve log")
                    
                    # Show last 50 lines of log (most relevant errors are usually at the end)
                    echo "$LOG_CONTENT" | tail -n 50
                    echo ""
                done
            else
                echo ""
                echo "⚠️  No log IDs found for failed steps"
            fi
            
            echo ""
            echo "=========================================="
            echo "Debug Information Summary"
            echo "=========================================="
            echo "Pipeline Name: $PIPELINE_NAME"
            echo "Pipeline ID: $PIPELINE_ID"
            echo "Project: $PROJECT"
            echo "Branch: $BRANCH"
            echo "Build ID: $BUILD_ID"
            echo "Build Number: $BUILD_NUMBER"
            echo "Build Result: $BUILD_RESULT"
            echo ""
            echo "View full build details:"
            echo "  az pipelines build show --id $BUILD_ID --project $PROJECT"
            echo ""
            echo "View build timeline:"
            echo "  az devops invoke --area build --resource timeline \\"
            echo "    --route-parameters project=$PROJECT buildId=$BUILD_ID \\"
            echo "    --api-version 7.1-preview"
            echo ""
            
            exit 1
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "=========================================="
echo "❌ Build Timeout"
echo "=========================================="
echo "Build did not complete after $MAX_ATTEMPTS attempts"
echo "Total wait time: $((MAX_ATTEMPTS * POLL_INTERVAL)) seconds"
echo ""
echo "Build ID: $BUILD_ID"
echo "Current Status: $BUILD_STATUS"
echo ""
echo "Check build status manually:"
echo "  az pipelines build show --id $BUILD_ID --project $PROJECT"
echo ""

exit 1