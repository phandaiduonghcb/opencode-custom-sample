# DevOps Automation System

An extensible, containerized platform that automates DevOps workflows through AI-powered instruction files. Each workflow is defined by a simple API endpoint and a markdown instruction file that guides the OpenCode SDK through automation steps.

## Overview

The DevOps Automation System follows an "instruction-driven automation" pattern where workflows are defined declaratively in markdown files rather than procedurally in code. This makes it easy to add new workflows, modify existing ones, and maintain the system over time.

### Key Features

- **Extensible**: Add new workflows by creating an API endpoint and instruction file
- **AI-Powered**: Leverages OpenCode SDK for intelligent automation
- **Azure Integration**: Built-in support for Azure DevOps, App Services, and Kubernetes
- **Observable**: Comprehensive logging and execution tracking
- **Containerized**: Runs consistently across environments

## Architecture

```
┌─────────────┐
│ API Client  │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│         Express API Server              │
│  ┌─────────────────────────────────┐   │
│  │   Workflow Controller           │   │
│  └─────────────┬───────────────────┘   │
│                │                        │
│  ┌─────────────▼───────────────────┐   │
│  │   OpenCode SDK Integration      │   │
│  └─────────────┬───────────────────┘   │
│                │                        │
│  ┌─────────────▼───────────────────┐   │
│  │   Instruction File System       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌────────┐  ┌────────┐  ┌────────┐
│ Git CLI│  │Azure CLI│ │kubectl │
└────────┘  └────────┘  └────────┘
```

## Quick Start

**New to the system?** See [QUICK_START.md](QUICK_START.md) for a 5-minute setup guide.

### Prerequisites

- Docker installed
- Azure App Registration (for Azure DevOps integration)
- OpenCode API key

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd devops-automation
```

2. Create environment configuration:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Build the Docker image:
```bash
docker build -t devops-automation .
```

4. Run the container:
```bash
docker run -p 3000:3000 --env-file .env devops-automation
```

5. Verify the service is running:
```bash
curl http://localhost:3000/api/health
```

## Environment Variables

See `.env.example` for a complete list. Key variables:

### Required

- `OPENCODE_API_KEY`: Your OpenCode SDK API key
- `AZURE_CLIENT_ID`: Azure App Registration client ID
- `AZURE_CLIENT_SECRET`: Azure App Registration secret
- `AZURE_TENANT_ID`: Azure tenant ID
- `AZURE_DEVOPS_ORG`: Azure DevOps organization name
- `AZURE_DEVOPS_PROJECT`: Azure DevOps project name

### Optional

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (info/debug/error)
- `WORKSPACE_ROOT`: Temporary workspace directory (default: /tmp/workflows)
- `MAX_CONCURRENT_WORKFLOWS`: Maximum concurrent executions (default: 5)

## API Endpoints

**API Documentation:** Access interactive Swagger UI at `http://localhost:3000/api-docs`

### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "opencode": "connected",
  "azure": "authenticated"
}
```

### Fix Vulnerabilities Workflow

Automatically fixes security vulnerabilities in project dependencies.

```http
POST /api/workflows/fix-vulnerabilities
Content-Type: application/json

{
  "prompt": "Fix CVE-2024-1234 in log4j package",
  "repositoryUrl": "https://dev.azure.com/org/project/_git/repo",
  "targetBranch": "develop"
}
```

Response:
```json
{
  "executionId": "1234567890",
  "status": "running",
  "message": "Workflow execution started"
}
```

### Get Workflow Status

```http
GET /api/workflows/:executionId/status
```

Response:
```json
{
  "executionId": "1234567890",
  "status": "success",
  "progress": "Completed all steps",
  "logs": [
    "Parsed vulnerability information",
    "Cloned repository",
    "Updated dependencies",
    "Created PR #123",
    "Pipeline succeeded",
    "Deployment validated"
  ],
  "result": {
    "success": true,
    "summary": "Fixed 2 vulnerabilities",
    "changes": [
      "Updated log4j from 2.14.0 to 2.17.1",
      "Updated jackson-databind from 2.12.0 to 2.13.4"
    ],
    "prUrl": "https://dev.azure.com/org/project/_git/repo/pullrequest/123"
  }
}
```

### List Available Workflows

```http
GET /api/workflows
```

Response:
```json
{
  "workflows": [
    {
      "name": "fix-vulnerabilities",
      "displayName": "Fix Vulnerabilities",
      "description": "Automatically fix security vulnerabilities in dependencies",
      "endpoint": "/api/workflows/fix-vulnerabilities"
    }
  ]
}
```

## Workflow Execution Flow

The vulnerability fix workflow follows these steps:

1. **Parse Vulnerability**: Extract package names and versions from the prompt
2. **Clone Repository**: Clone the target repository to a temporary workspace
3. **Identify Dependencies**: Find all dependency files (pom.xml, package.json, Dockerfile)
4. **Update Dependencies**: Apply version updates to fix vulnerabilities
5. **Create Branch & PR**: Create automation branch and pull request
6. **Monitor Pipeline**: Poll Azure Pipeline status until completion
7. **Handle Failures**: If pipeline fails, analyze logs and apply fixes (up to 5 iterations)
8. **Validate Deployment**: Check App Service or Kubernetes pod health
9. **Complete**: Generate summary report

## Adding New Workflows

Adding a new workflow requires three simple steps:

### 1. Create Instruction File

Create `workflows/<workflow-name>-instructions.md`:

```markdown
# My Workflow

## Overview
What this workflow does...

## Available Tools
- Git CLI
- Azure CLI
- kubectl
- Helper scripts

## Execution Steps

### Step 1: Do something
Instructions for OpenCode SDK...

### Step 2: Do something else
More instructions...
```

### 2. Add API Endpoint

In `server.js`, add a new route:

```javascript
app.post('/api/workflows/my-workflow', async (req, res) => {
  try {
    const { prompt, ...options } = req.body;
    
    const result = await workflowController.executeWorkflow(
      'my-workflow',
      prompt,
      options
    );
    
    res.json(result);
  } catch (error) {
    logger.error('My workflow error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Test

```bash
curl -X POST http://localhost:3000/api/workflows/my-workflow \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Do something"}'
```

That's it! The system handles instruction loading, OpenCode SDK integration, and execution tracking automatically.

## Docker Deployment

### Build Image

```bash
docker build -t devops-automation:latest .
```

### Run Container

```bash
docker run -d \
  --name devops-automation \
  -p 3000:3000 \
  --env-file .env \
  -v /var/log/devops-automation:/app/logs \
  devops-automation:latest
```

### Using Docker Compose

```bash
docker-compose up -d
```

### View Logs

```bash
docker logs -f devops-automation
```

### Stop Container

```bash
docker stop devops-automation
docker rm devops-automation
```

## Azure Setup

### Create App Registration

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Name: "DevOps Automation"
4. Click "Register"
5. Note the "Application (client) ID" and "Directory (tenant) ID"
6. Go to "Certificates & secrets" → "New client secret"
7. Note the secret value (only shown once)

### Grant Permissions

The App Registration needs:
- Azure DevOps: Code (Read & Write), Build (Read & Execute), Pull Request (Read & Write)
- Azure Resources: Reader role on resource groups containing App Services or AKS clusters

### Configure Azure CLI

The container automatically configures Azure CLI on startup using the provided credentials.

## Troubleshooting

### Authentication Errors

```
Error: Azure authentication failed
```

Solution: Verify `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID` are correct.

### OpenCode SDK Errors

```
Error: OpenCode API key invalid
```

Solution: Check `OPENCODE_API_KEY` is set correctly.

### Git Push Failures

```
Error: Permission denied (publickey)
```

Solution: Ensure the Azure App Registration has write access to the repository.

### Pipeline Not Found

```
Error: No pipeline found for branch
```

Solution: Wait a few seconds after PR creation for the pipeline to start, or check Azure DevOps configuration.

### Deployment Validation Fails

```
Error: Deployment resource not healthy
```

Solution: Check application logs for runtime errors. The workflow will attempt to fix issues automatically.

## Logging

All workflow executions are logged to stdout for container log aggregation. Log format:

```
[2024-03-08T10:30:00.000Z] INFO: Workflow execution started - executionId: 1234567890
[2024-03-08T10:30:01.000Z] INFO: Loaded instruction file: fix-vulnerabilities-instructions.md
[2024-03-08T10:30:02.000Z] INFO: Created OpenCode session: session-abc123
[2024-03-08T10:30:05.000Z] INFO: Parsed vulnerabilities: 2 packages
[2024-03-08T10:30:10.000Z] INFO: Cloned repository to workspace
[2024-03-08T10:30:15.000Z] INFO: Updated dependencies in 3 files
[2024-03-08T10:30:20.000Z] INFO: Created PR #123
[2024-03-08T10:30:25.000Z] INFO: Pipeline started: pipeline-456
[2024-03-08T10:35:00.000Z] INFO: Pipeline succeeded
[2024-03-08T10:35:05.000Z] INFO: Deployment validated: healthy
[2024-03-08T10:35:06.000Z] INFO: Workflow completed successfully
```

## Security

### Credential Management

- Store all credentials in environment variables
- Never commit secrets to version control
- Rotate credentials regularly
- Use Azure Managed Identity when possible

### API Security

- Implement authentication for production deployments
- Use HTTPS in production
- Rate limit API requests
- Validate all user input

### Container Security

- Runs as non-root user
- Minimal base image (node:18-alpine)
- Regular security scans
- Keep dependencies updated

## Performance

### Concurrency

The system limits concurrent workflow executions to prevent resource exhaustion. Configure with `MAX_CONCURRENT_WORKFLOWS` environment variable.

### Resource Cleanup

Temporary workspaces are automatically cleaned up after workflow completion or failure.

### Timeouts

- Pipeline monitoring: 30 minutes
- Deployment validation: 5 minutes
- Overall workflow: 60 minutes

## Development

### Local Development

```bash
npm install
npm start
```

### Running Tests

```bash
npm test
```

### Code Style

Follow the guidelines in `AGENTS.md`.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Consult the instruction files in `workflows/`
4. Check Azure DevOps pipeline logs

## License

[Your License Here]
