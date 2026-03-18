#!/bin/bash

# DevOps Automation System - Docker Build and Test Script
# This script builds the Docker image and runs basic tests

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  DevOps Automation System - Docker Build & Test          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="devops-automation"
CONTAINER_NAME="devops-automation-test"
PORT=3000

# Step 1: Build Docker image
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Building Docker image..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker build -t $IMAGE_NAME:latest .; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

# Step 2: Check if .env file exists
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Checking environment configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env with your actual credentials before running the container${NC}"
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# Step 3: Stop and remove existing container if running
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Cleaning up existing containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker ps -a | grep -q $CONTAINER_NAME; then
    echo "Stopping and removing existing container..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    echo -e "${GREEN}✓ Cleaned up existing container${NC}"
else
    echo "No existing container found"
fi

# Step 4: Run container
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Starting container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:$PORT \
    --env-file .env \
    $IMAGE_NAME:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
    echo "Container name: $CONTAINER_NAME"
    echo "Port: $PORT"
else
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi

# Step 5: Wait for container to be ready
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Waiting for container to be ready..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Container is ready${NC}"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo -e "${RED}✗ Container failed to become ready${NC}"
        echo "Container logs:"
        docker logs $CONTAINER_NAME
        exit 1
    fi
done

# Step 6: Run health check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Running health check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH_RESPONSE=$(curl -s http://localhost:$PORT/api/health)
echo "Health check response:"
echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi

# Step 7: Show container logs
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Container logs (last 20 lines)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker logs --tail 20 $CONTAINER_NAME

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Docker Build & Test Complete                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Docker image built: $IMAGE_NAME:latest${NC}"
echo -e "${GREEN}✓ Container running: $CONTAINER_NAME${NC}"
echo -e "${GREEN}✓ API available at: http://localhost:$PORT${NC}"
echo ""
echo "Next steps:"
echo "  1. View logs:        docker logs -f $CONTAINER_NAME"
echo "  2. Run tests:        node test-workflow.js"
echo "  3. Stop container:   docker stop $CONTAINER_NAME"
echo "  4. Remove container: docker rm $CONTAINER_NAME"
echo ""
echo "API Endpoints:"
echo "  - Health:            curl http://localhost:$PORT/api/health"
echo "  - List workflows:    curl http://localhost:$PORT/api/workflows"
echo "  - Fix vulnerabilities: curl -X POST http://localhost:$PORT/api/workflows/fix-vulnerabilities \\"
echo "                         -H 'Content-Type: application/json' \\"
echo "                         -d '{\"prompt\":\"Fix CVE-2024-1234\",\"repositoryUrl\":\"https://github.com/example/repo.git\"}'"
echo ""
