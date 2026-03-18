# Implementation Plan

- [x] 1. Set up project structure and core Express API





  - Create Express server with basic routing structure
  - Configure environment variable loading (.env support)
  - Set up logging infrastructure (winston or similar)
  - Create workflows directory for instruction files
  - Create scripts directory for helper scripts
  - _Requirements: 1.1, 1.2, 2.1, 10.2, 10.3_

- [x] 2. Implement OpenCode SDK integration




  - [x] 2.1 Create OpenCodeExecutor class to manage SDK sessions


    - Initialize OpenCode SDK with API key from environment
    - Implement createSession method that loads instruction files
    - Implement executeWithPrompt method to send user input to OpenCode
    - Handle session lifecycle (create, execute, cleanup)
    - _Requirements: 2.2, 2.3, 11.3_

  - [x] 2.2 Implement instruction file loading system


    - Create function to read instruction files from workflows directory
    - Support markdown format for instruction files
    - Pass instruction file content as system context to OpenCode
    - _Requirements: 1.2, 11.1, 11.2, 11.3_


  - [x] 2.3 Implement workflow execution tracking

    - Create WorkflowExecution data model
    - Store execution state (executionId, status, logs, results)
    - Implement status query endpoint GET /api/workflows/:executionId/status
    - _Requirements: 2.4, 8.3_

- [x] 3. Create vulnerability fix workflow API endpoint






  - [x] 3.1 Implement POST /api/workflows/fix-vulnerabilities endpoint

    - Validate request body (prompt, repositoryUrl, targetBranch)
    - Generate unique executionId
    - Load fix-vulnerabilities-instructions.md file
    - Create OpenCode session with instruction file
    - Pass user prompt and context to OpenCode
    - Return executionId and initial status
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Implement asynchronous workflow execution


    - Execute workflow in background (don't block API response)
    - Update execution status as workflow progresses
    - Store logs and results for later retrieval
    - Handle workflow completion and errors
    - _Requirements: 2.5, 8.3_

- [x] 4. Write vulnerability fix instruction file



  - [x] 4.1 Create workflows/fix-vulnerabilities-instructions.md


    - Document workflow overview and objectives
    - List available tools (Git CLI, Azure CLI, kubectl, helper scripts)
    - Write Step 0: Setup workspace and environment
    - Write Step 1: Parse vulnerability prompt using helper script
    - Write Step 2: Clone repository to workspace
    - Write Step 3: Identify dependency files (pom.xml, package.json, Dockerfile)
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 4.2 Add dependency update steps to instruction file


    - Write Step 4: Update dependencies in files (OpenCode edits directly)
    - Provide examples for Maven, npm, and Dockerfile updates
    - Write Step 5: Create automation branch with naming pattern
    - Write Step 6: Commit changes and push to remote
    - Write Step 7: Create pull request using Azure CLI
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [x] 4.3 Add pipeline monitoring steps to instruction file


    - Write Step 8: Get pipeline ID for the branch
    - Write Step 9: Poll pipeline status every 30 seconds
    - Write Step 10: Handle pipeline failures (retrieve logs, analyze, fix)
    - Document iteration logic (up to 5 attempts)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.4 Add deployment validation steps to instruction file


    - Write Step 11: Identify deployment resource type
    - Write Step 12: Check App Service or K8s pod health
    - Write Step 13: Retrieve and analyze application logs
    - Write Step 14: Handle deployment issues (fix and retry)
    - Write Step 15: Complete workflow and generate summary
    - Document success criteria and error handling
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4_
-

- [x] 5. Create helper scripts





  - [x] 5.1 Create scripts/parse-vulnerability-prompt.sh

    - Accept vulnerability prompt as input
    - Parse natural language to extract package names, versions
    - Output structured JSON with vulnerability data
    - Handle various prompt formats (security scans, CVE descriptions)
    - _Requirements: 3.1_


  - [x] 5.2 Create scripts/check-deployment-health.sh

    - Accept deployment type and resource name as parameters
    - Check App Service health endpoint and status
    - Check Kubernetes pod status and readiness
    - Return "healthy" or "unhealthy" with details
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Implement Azure authentication and CLI setup










  - [x] 6.1 Configure Azure CLI authentication


    - Load Azure credentials from environment variables (CLIENT_ID, CLIENT_SECRET, TENANT_ID)
    - Implement Azure login using service principal
    - Configure Azure DevOps defaults (organization, project)
    - Handle authentication errors with clear messages
    - _Requirements: 9.1, 9.2, 9.5_



  - [x] 6.2 Provide Azure CLI command examples in instruction file

    - Document az pipelines commands for status and logs
    - Document az repos pr create command
    - Document az webapp and az aks commands for resource queries
    - Document kubectl commands for Kubernetes operations
    - _Requirements: 9.3, 9.4_

- [x] 7. Create Dockerfile for containerization





  - [x] 7.1 Write Dockerfile with all dependencies

    - Use node:18-alpine as base image
    - Install Git, Python, Azure CLI, kubectl
    - Copy application code and install npm dependencies
    - Create workspace directory (/tmp/workflows)
    - Run as non-root user for security
    - Expose port 3000
    - _Requirements: 10.1, 10.4_


  - [x] 7.2 Create .dockerignore file

    - Exclude node_modules, .git, .env files
    - Exclude temporary and log files
    - _Requirements: 10.1_

  - [x] 7.3 Create docker-compose.yml for local testing


    - Define service with environment variables
    - Mount volumes for development
    - Configure port mapping

   - _Requirements: 10.1, 10.2_

- [x] 8. Implement error handling and logging



  - [x] 8.1 Add comprehensive error handling


    - Catch and handle validation errors (400)
    - Catch and handle authentication errors (401)
    - Catch and handle workflow execution errors (500)
    - Catch and handle timeout errors (504)
    - Return consistent error response format
    - _Requirements: 8.4_



  - [ ] 8.2 Implement structured logging
    - Log all workflow executions with executionId
    - Log OpenCode SDK interactions
    - Log Azure CLI command executions



    - Log errors with stack traces


    - Output logs to stdout for container log aggregation
    - _Requirements: 10.5_

- [x] 9. Add health check and monitoring endpoints






  - [x] 9.1 Implement GET /api/health endpoint



    - Return service status and version
    - Check OpenCode SDK connectivity
    - Check Azure CLI authentication status
    - _Requirements: 10.3_



  - [ ] 9.2 Implement GET /api/workflows endpoint
    - List all available workflows
    - Return workflow metadata (name, description, endpoint)
    - _Requirements: 1.1, 2.1_

- [ ] 10. Create documentation and configuration files

  - [x] 10.1 Create README.md


    - Document system overview and architecture
    - Provide setup instructions


    - Document environment variables
    - Provide API endpoint documentation
    - Include Docker deployment instructions
    - _Requirements: 10.2_



  - [ ] 10.2 Create .env.example file
    - List all required environment variables
    - Provide example values and descriptions
    - Include Azure credentials, OpenCode API key, DevOps settings
    - _Requirements: 10.2_

  - [ ]* 10.3 Create API documentation
    - Document all API endpoints with request/response examples
    - Document workflow execution flow
    - Provide curl examples for testing
    - _Requirements: 2.1, 2.4_

- [ ] 11. Wire everything together and test

  - [ ] 11.1 Integrate all components in server.js
    - Initialize Express app with all routes
    - Set up OpenCode SDK integration
    - Configure Azure CLI authentication on startup
    - Implement graceful shutdown
    - _Requirements: 1.1, 1.5, 2.1_

  - [ ] 11.2 Test vulnerability fix workflow end-to-end
    - Build Docker image
    - Run container with test environment variables
    - Call POST /api/workflows/fix-vulnerabilities with test prompt
    - Verify workflow execution and status updates
    - Check logs for errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 11.3 Create example workflow for future extensibility
    - Create a simple second workflow (e.g., deployment-instructions.md)
    - Add corresponding API endpoint
    - Demonstrate how easy it is to add new workflows
    - _Requirements: 1.1, 1.2, 1.5_
