# Quick Start Guide

Get the DevOps Automation System running in 5 minutes.

## Prerequisites

- Docker installed
- Node.js 18+ installed
- Git installed

## Step 1: Verify Integration

```bash
npm run verify
```

This checks that all components are properly wired together.

## Step 2: Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit with your credentials
# Required:
# - OPENCODE_API_KEY
# - AZURE_CLIENT_ID
# - AZURE_CLIENT_SECRET
# - AZURE_TENANT_ID
# - AZURE_DEVOPS_ORG
# - AZURE_DEVOPS_PROJECT
```

## Step 3: Choose Your Path

### Option A: Run Locally

```bash
# Start the server
npm start

# In another terminal, test it
curl http://localhost:3000/api/health
```

### Option B: Run with Docker

```bash
# Build and test with Docker
npm run test:docker

# Or manually:
docker build -t devops-automation .
docker run -d -p 3000:3000 --env-file .env devops-automation
```

## Step 4: Test the API

**Interactive API Documentation:** Open http://localhost:3000/api-docs in your browser for Swagger UI

### Health Check

```bash
curl http://localhost:3000/api/health
```

### List Workflows

```bash
curl http://localhost:3000/api/workflows
```

### Execute Workflow

```bash
curl -X POST http://localhost:3000/api/workflows/fix-vulnerabilities \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Fix CVE-2021-44228 in log4j. Update from 2.14.0 to 2.17.1",
    "repositoryUrl": "https://dev.azure.com/myorg/myproject/_git/myrepo",
    "targetBranch": "develop"
  }'
```

### Check Status

```bash
# Use the executionId from the previous response
curl http://localhost:3000/api/workflows/{executionId}/status
```

## Step 5: Run Tests

```bash
# Run automated test suite
npm test

# Skip long-running workflow test
$env:SKIP_WORKFLOW_TEST="true"  # Windows
export SKIP_WORKFLOW_TEST=true   # Linux/Mac
npm test
```

## Common Commands

```bash
# Verify integration
npm run verify

# Start server
npm start

# Run tests
npm test

# Docker build and test
npm run test:docker

# View logs (Docker)
docker logs -f devops-automation-test

# Stop container
docker stop devops-automation-test
```

## Troubleshooting

### Server won't start

Check:
- Is port 3000 available?
- Are environment variables set?
- Run `npm run verify` to check setup

### Health check fails

Check:
- Is OpenCode SDK accessible?
- Are Azure credentials valid?
- Check logs for errors

### Workflow fails

Check:
- Azure credentials are correct
- Repository URL is accessible
- Azure DevOps org/project are configured
- Check execution logs via status endpoint

## Next Steps

- Read [TESTING.md](TESTING.md) for detailed testing guide
- Read [README.md](README.md) for full documentation
- Read [AGENTS.md](AGENTS.md) for development guidelines

## Support

For issues:
1. Run `npm run verify` to check setup
2. Check logs for error messages
3. Review [TESTING.md](TESTING.md) troubleshooting section
4. Consult [README.md](README.md) for detailed documentation

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows/fix-vulnerabilities` | Execute vulnerability fix |
| GET | `/api/workflows/:id/status` | Get execution status |

## Environment Variables (Required)

```bash
OPENCODE_API_KEY=your-key
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_DEVOPS_ORG=your-org
AZURE_DEVOPS_PROJECT=your-project
```

See `.env.example` for all available options.
