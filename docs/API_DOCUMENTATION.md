# API Documentation

## Swagger UI

The DevOps Automation API includes interactive API documentation using Swagger/OpenAPI 3.0.

### Accessing Swagger UI

Start the server and navigate to:

```
http://localhost:3000/api-docs
```

### Features

- **Interactive Testing**: Try out API endpoints directly from the browser
- **Request/Response Examples**: See example payloads and responses
- **Schema Validation**: View detailed schema definitions
- **Authentication**: Test with your credentials
- **Export**: Download OpenAPI specification as JSON

### OpenAPI Specification

Download the raw OpenAPI specification:

```
http://localhost:3000/api-docs.json
```

## API Overview

### Base URL

```
http://localhost:3000
```

### Content Type

All requests and responses use `application/json`.

### Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-03-08T10:30:00.000Z",
    "details": {
      "additionalInfo": "value"
    }
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400): Invalid request parameters
- `AUTH_ERROR` (401): Authentication failed
- `WORKFLOW_EXECUTION_ERROR` (500): Workflow execution failed
- `TIMEOUT_ERROR` (504): Request timeout
- `INTERNAL_ERROR` (500): Internal server error

## Endpoints

### Health Check

**GET** `/api/health`

Returns system health status including OpenCode SDK and Azure CLI connectivity.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "opencode": {
    "status": "connected",
    "baseUrl": "http://localhost:4096"
  },
  "azure": {
    "authenticated": true,
    "tenantId": "xxx",
    "subscriptionId": "xxx",
    "subscriptionName": "My Subscription",
    "devopsOrg": "my-org",
    "devopsProject": "my-project"
  }
}
```

### List Workflows

**GET** `/api/workflows`

Returns a list of all available workflows.

**Response:**
```json
{
  "workflows": [
    {
      "name": "fix-vulnerabilities",
      "displayName": "Fix Vulnerabilities",
      "endpoint": "/api/workflows/fix-vulnerabilities",
      "instructionFile": "fix-vulnerabilities-instructions.md"
    }
  ]
}
```

### Execute Vulnerability Fix Workflow

**POST** `/api/workflows/fix-vulnerabilities`

Starts a workflow to automatically fix security vulnerabilities.

**Request Body:**
```json
{
  "prompt": "Fix CVE-2021-44228 in log4j. Update log4j-core from 2.14.0 to 2.17.1",
  "repositoryUrl": "https://dev.azure.com/myorg/myproject/_git/myrepo",
  "targetBranch": "develop"
}
```

**Required Fields:**
- `prompt`: Description of the vulnerability to fix
- `repositoryUrl`: Azure DevOps repository URL

**Optional Fields:**
- `targetBranch`: Target branch for PR (default: "develop")

**Response:**
```json
{
  "executionId": "abc123-def456-ghi789",
  "status": "running",
  "message": "Workflow execution started"
}
```

### Get Workflow Status

**GET** `/api/workflows/{executionId}/status`

Returns the current status and details of a workflow execution.

**Path Parameters:**
- `executionId`: Unique execution identifier

**Response:**
```json
{
  "executionId": "abc123-def456-ghi789",
  "workflowName": "fix-vulnerabilities",
  "status": "success",
  "startTime": "2024-03-08T10:30:00.000Z",
  "endTime": "2024-03-08T10:35:00.000Z",
  "duration": 300000,
  "userInput": {
    "prompt": "Fix CVE-2021-44228...",
    "repositoryUrl": "https://...",
    "targetBranch": "develop"
  },
  "context": {
    "sessionId": "session-abc123"
  },
  "iterations": 0,
  "logs": [
    {
      "timestamp": "2024-03-08T10:30:00.000Z",
      "message": "Workflow execution started"
    },
    {
      "timestamp": "2024-03-08T10:30:01.000Z",
      "message": "Loading instruction file"
    }
  ],
  "result": {
    "success": true,
    "summary": "Fixed 2 vulnerabilities",
    "changes": [
      "Updated log4j from 2.14.0 to 2.17.1",
      "Updated jackson-databind from 2.12.0 to 2.13.4"
    ],
    "errors": []
  }
}
```

## Status Values

Workflow executions can have the following statuses:

- `pending`: Workflow is queued but not yet started
- `running`: Workflow is currently executing
- `success`: Workflow completed successfully
- `failed`: Workflow failed with errors

## Using Swagger UI

### 1. Explore Endpoints

Browse all available endpoints organized by tags:
- **Health**: System health and status
- **Workflows**: Workflow management and execution

### 2. View Schemas

Click on any schema to see detailed field definitions, types, and examples.

### 3. Try It Out

1. Click "Try it out" on any endpoint
2. Fill in the required parameters
3. Click "Execute"
4. View the response

### 4. Example Workflow

1. **Check Health**
   - GET `/api/health`
   - Verify system is ready

2. **List Workflows**
   - GET `/api/workflows`
   - See available workflows

3. **Start Workflow**
   - POST `/api/workflows/fix-vulnerabilities`
   - Provide prompt and repository URL
   - Note the `executionId` from response

4. **Poll Status**
   - GET `/api/workflows/{executionId}/status`
   - Check status until `success` or `failed`

## Code Generation

Swagger UI can generate client code in multiple languages:

1. Click "Download" in Swagger UI
2. Select your language (JavaScript, Python, Java, etc.)
3. Use the generated client in your application

## OpenAPI Specification

The API follows OpenAPI 3.0 specification. You can:

- Import into Postman
- Generate client SDKs
- Validate requests/responses
- Generate documentation
- Create mock servers

## Integration Examples

### JavaScript/Node.js

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/workflows/fix-vulnerabilities', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Fix CVE-2021-44228 in log4j',
    repositoryUrl: 'https://dev.azure.com/org/project/_git/repo',
    targetBranch: 'develop'
  })
});

const data = await response.json();
console.log('Execution ID:', data.executionId);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/api/workflows/fix-vulnerabilities',
    json={
        'prompt': 'Fix CVE-2021-44228 in log4j',
        'repositoryUrl': 'https://dev.azure.com/org/project/_git/repo',
        'targetBranch': 'develop'
    }
)

data = response.json()
print(f"Execution ID: {data['executionId']}")
```

### cURL

```bash
curl -X POST http://localhost:3000/api/workflows/fix-vulnerabilities \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Fix CVE-2021-44228 in log4j",
    "repositoryUrl": "https://dev.azure.com/org/project/_git/repo",
    "targetBranch": "develop"
  }'
```

## Best Practices

1. **Always check health** before starting workflows
2. **Poll status** periodically (every 3-5 seconds)
3. **Handle errors** gracefully with retry logic
4. **Validate input** before sending requests
5. **Use HTTPS** in production
6. **Implement authentication** for production deployments

## Troubleshooting

### Swagger UI Not Loading

- Verify server is running: `curl http://localhost:3000/api/health`
- Check browser console for errors
- Try accessing `/api-docs.json` directly

### CORS Issues

If accessing from a different domain, configure CORS in server.js:

```javascript
import cors from 'cors';
app.use(cors());
```

### Schema Validation Errors

- Check request body matches schema exactly
- Ensure all required fields are present
- Verify data types (string, number, boolean)
- Check URL format for `repositoryUrl`

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [API Design Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)

## Support

For API-related questions:
1. Check Swagger UI for endpoint details
2. Review example requests/responses
3. Consult [TESTING.md](TESTING.md) for testing examples
4. See [README.md](README.md) for general documentation
