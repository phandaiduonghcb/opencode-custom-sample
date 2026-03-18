# DevOps Automation System - Docker Build and Test Script (PowerShell)
# This script builds the Docker image and runs basic tests

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DevOps Automation System - Docker Build & Test          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$IMAGE_NAME = "devops-automation"
$CONTAINER_NAME = "devops-automation-test"
$PORT = 3000

# Step 1: Build Docker image
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 1: Building Docker image..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    docker build -t "${IMAGE_NAME}:latest" .
    Write-Host "✓ Docker image built successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker build failed" -ForegroundColor Red
    exit 1
}

# Step 2: Check if .env file exists
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 2: Checking environment configuration..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (-not (Test-Path .env)) {
    Write-Host "⚠ .env file not found" -ForegroundColor Yellow
    Write-Host "Creating .env from .env.example..."
    Copy-Item .env.example .env
    Write-Host "⚠ Please edit .env with your actual credentials before running the container" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file found" -ForegroundColor Green
}

# Step 3: Stop and remove existing container if running
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 3: Cleaning up existing containers..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$existingContainer = docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}"
if ($existingContainer -eq $CONTAINER_NAME) {
    Write-Host "Stopping and removing existing container..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
    Write-Host "✓ Cleaned up existing container" -ForegroundColor Green
} else {
    Write-Host "No existing container found"
}

# Step 4: Run container
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 4: Starting container..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    docker run -d `
        --name $CONTAINER_NAME `
        -p "${PORT}:${PORT}" `
        --env-file .env `
        "${IMAGE_NAME}:latest"
    
    Write-Host "✓ Container started successfully" -ForegroundColor Green
    Write-Host "Container name: $CONTAINER_NAME"
    Write-Host "Port: $PORT"
} catch {
    Write-Host "✗ Failed to start container" -ForegroundColor Red
    exit 1
}

# Step 5: Wait for container to be ready
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 5: Waiting for container to be ready..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$MAX_ATTEMPTS = 30
$ATTEMPT = 0
$ready = $false

while ($ATTEMPT -lt $MAX_ATTEMPTS) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:${PORT}/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Container is ready" -ForegroundColor Green
            $ready = $true
            break
        }
    } catch {
        # Continue waiting
    }
    
    $ATTEMPT++
    Write-Host "Waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "✗ Container failed to become ready" -ForegroundColor Red
    Write-Host "Container logs:"
    docker logs $CONTAINER_NAME
    exit 1
}

# Step 6: Run health check
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 6: Running health check..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:${PORT}/api/health" -Method Get
    Write-Host "Health check response:"
    $healthResponse | ConvertTo-Json -Depth 10
    
    if ($healthResponse.status -eq "healthy") {
        Write-Host "✓ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "✗ Health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Step 7: Show container logs
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 7: Container logs (last 20 lines)..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

docker logs --tail 20 $CONTAINER_NAME

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Docker Build & Test Complete                             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Docker image built: ${IMAGE_NAME}:latest" -ForegroundColor Green
Write-Host "✓ Container running: $CONTAINER_NAME" -ForegroundColor Green
Write-Host "✓ API available at: http://localhost:${PORT}" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. View logs:        docker logs -f $CONTAINER_NAME"
Write-Host "  2. Run tests:        node test-workflow.js"
Write-Host "  3. Stop container:   docker stop $CONTAINER_NAME"
Write-Host "  4. Remove container: docker rm $CONTAINER_NAME"
Write-Host ""
Write-Host "API Endpoints:"
Write-Host "  - Health:            curl http://localhost:${PORT}/api/health"
Write-Host "  - List workflows:    curl http://localhost:${PORT}/api/workflows"
Write-Host "  - Fix vulnerabilities:"
Write-Host "    Invoke-RestMethod -Uri http://localhost:${PORT}/api/workflows/fix-vulnerabilities ``"
Write-Host "      -Method Post ``"
Write-Host "      -ContentType 'application/json' ``"
Write-Host "      -Body '{\"prompt\":\"Fix CVE-2024-1234\",\"repositoryUrl\":\"https://github.com/example/repo.git\"}'"
Write-Host ""
