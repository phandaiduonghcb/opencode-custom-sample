# Requirements Document

## Introduction

The DevOps Automation system is an extensible, containerized platform that automates various DevOps tasks through dedicated API endpoints. Each workflow (e.g., vulnerability fixing, deployment, infrastructure setup) has its own API endpoint and instruction file that guides the OpenCode SDK through the automation steps. The system is designed to make adding new workflows simple - just create a new API endpoint, write an instruction file, and configure the necessary tools. The initial workflow focuses on automated vulnerability fixing with Azure DevOps integration.

## Glossary

- **DevOps Automation System**: The containerized platform that provides API endpoints for multiple automated DevOps workflows
- **Workflow**: A specific automation sequence (e.g., vulnerability fixing, deployment) with its own API endpoint and instruction file
- **Instruction File**: A markdown file containing step-by-step guidance for the OpenCode SDK to execute a workflow
- **OpenCode SDK**: The AI-powered SDK that reads instruction files and executes automation tasks
- **Vulnerability Fix Workflow**: The initial workflow that remediates security vulnerabilities in project dependencies
- **Dependency File**: Configuration files that declare project dependencies (e.g., pom.xml, Dockerfile, package.json, package-lock.json)
- **Azure Pipeline**: The CI/CD pipeline system that builds, tests, and deploys code changes
- **Deployment Resource**: The runtime environment where the application runs (e.g., Azure App Service, Kubernetes Pod)
- **Automation Branch**: A Git branch created for automated changes, following the pattern "ai/<workflow-type>/<identifier>"
- **Pipeline Status**: The current state of the Azure DevOps pipeline execution (running, succeeded, failed)
- **App Registration**: Azure Active Directory application registration providing clientId and clientSecret for authentication
- **Workflow Tools**: Utilities and scripts available to a workflow (e.g., Git commands, Azure CLI, file parsers)

## Requirements

### Requirement 1

**User Story:** As a platform architect, I want to easily add new workflows by creating API endpoints and instruction files, so that the system can grow without complex refactoring

#### Acceptance Criteria

1. THE DevOps Automation System SHALL support adding new workflows by creating a new API route handler
2. WHEN a new workflow is added, THE DevOps Automation System SHALL load its Instruction File from a designated directory
3. THE DevOps Automation System SHALL provide each workflow with access to shared Workflow Tools (Git, Azure CLI, file operations)
4. THE DevOps Automation System SHALL maintain workflow isolation so that failures in one workflow do not affect others
5. THE DevOps Automation System SHALL require minimal code changes to add a new workflow endpoint

### Requirement 2

**User Story:** As a developer, I want to call a specific workflow API endpoint with my input, so that the appropriate automation executes

#### Acceptance Criteria

1. THE DevOps Automation System SHALL expose a REST API endpoint for each workflow (e.g., POST /api/workflows/fix-vulnerabilities)
2. WHEN a workflow endpoint is called, THE DevOps Automation System SHALL load the corresponding Instruction File
3. THE DevOps Automation System SHALL pass the user's input and Instruction File to the OpenCode SDK for execution
4. THE DevOps Automation System SHALL return the workflow execution status and results to the caller
5. THE DevOps Automation System SHALL support both synchronous and asynchronous workflow execution modes

### Requirement 3

**User Story:** As a developer, I want the vulnerability fix workflow to research and apply appropriate fixes to dependency files, so that vulnerabilities are resolved correctly

#### Acceptance Criteria

1. WHEN the Vulnerability Fix Workflow processes a vulnerability, THE DevOps Automation System SHALL identify all Dependency Files that contain the vulnerable package
2. THE DevOps Automation System SHALL update package versions in pom.xml files following Maven XML syntax
3. THE DevOps Automation System SHALL update package versions in Dockerfile files following Dockerfile syntax
4. THE DevOps Automation System SHALL update package versions in package.json and package-lock.json files following npm/yarn conventions
5. WHEN multiple vulnerabilities affect the same package, THE DevOps Automation System SHALL apply the highest recommended version that resolves all vulnerabilities

### Requirement 4

**User Story:** As a developer, I want workflows to create pull requests on dedicated branches, so that automated changes are isolated and reviewable

#### Acceptance Criteria

1. WHEN a Workflow makes code changes, THE DevOps Automation System SHALL create an Automation Branch from the develop branch with naming pattern "ai/<workflow-type>/<timestamp-or-identifier>"
2. THE DevOps Automation System SHALL commit all changes to the Automation Branch with a descriptive commit message
3. THE DevOps Automation System SHALL push the Automation Branch to the remote repository
4. THE DevOps Automation System SHALL create a pull request from the Automation Branch to the develop branch with a summary of changes

### Requirement 5

**User Story:** As a developer, I want the system to monitor the Azure DevOps pipeline status, so that build and test failures are detected automatically

#### Acceptance Criteria

1. WHEN a pull request is created, THE DevOps Automation System SHALL retrieve the associated Azure Pipeline execution identifier
2. WHILE the Azure Pipeline is running, THE DevOps Automation System SHALL poll the Pipeline Status at regular intervals not exceeding 30 seconds
3. WHEN the Azure Pipeline completes with a failed status, THE DevOps Automation System SHALL retrieve the pipeline logs
4. THE DevOps Automation System SHALL parse pipeline logs to identify specific build errors, test failures, or deployment issues
5. IF the Azure Pipeline fails, THEN THE DevOps Automation System SHALL analyze the failure and determine if it is related to the automated changes

### Requirement 6

**User Story:** As a developer, I want the system to automatically fix pipeline failures caused by automated changes, so that workflows continue without manual intervention

#### Acceptance Criteria

1. WHEN a pipeline failure is detected and related to automated changes, THE DevOps Automation System SHALL identify the root cause from pipeline logs
2. THE DevOps Automation System SHALL apply corrective changes to relevant files or configuration
3. THE DevOps Automation System SHALL commit the corrective changes to the same Automation Branch with a descriptive message
4. THE DevOps Automation System SHALL wait for the new pipeline execution to complete before proceeding
5. THE DevOps Automation System SHALL limit fix attempts to a maximum of 5 iterations per workflow execution to prevent infinite loops

### Requirement 7

**User Story:** As a developer, I want the system to validate deployed resources after pipeline success, so that runtime issues are detected before completion

#### Acceptance Criteria

1. WHEN the Azure Pipeline succeeds, THE DevOps Automation System SHALL identify the Deployment Resource type (App Service or Kubernetes Pod)
2. WHERE the Deployment Resource is an Azure App Service, THE DevOps Automation System SHALL verify the application health endpoint returns a successful response
3. WHERE the Deployment Resource is a Kubernetes Pod, THE DevOps Automation System SHALL verify the pod status is "Running" and ready checks pass
4. THE DevOps Automation System SHALL retrieve application logs from the Deployment Resource to check for runtime errors
5. IF the Deployment Resource shows errors or unhealthy status, THEN THE DevOps Automation System SHALL analyze the logs and apply corrective fixes to the code

### Requirement 8

**User Story:** As a developer, I want workflows to iterate until all checks pass, so that only fully validated changes are delivered

#### Acceptance Criteria

1. WHILE pipeline failures or deployment issues exist, THE DevOps Automation System SHALL continue the fix-commit-validate cycle
2. WHEN both pipeline and deployment validation succeed, THE DevOps Automation System SHALL mark the workflow execution as complete
3. THE DevOps Automation System SHALL provide a summary report listing all changes made, number of iterations, and final status
4. IF the maximum iteration limit is reached without success, THEN THE DevOps Automation System SHALL report the failure with detailed diagnostics and halt execution

### Requirement 9

**User Story:** As a developer, I want the system to authenticate with Azure services using App Registration credentials, so that it can securely access Azure DevOps and other resources

#### Acceptance Criteria

1. THE DevOps Automation System SHALL authenticate with Azure DevOps using App Registration credentials (clientId and clientSecret)
2. THE DevOps Automation System SHALL load App Registration credentials from environment variables
3. THE DevOps Automation System SHALL execute Azure CLI commands to query pipeline status by pipeline ID
4. THE DevOps Automation System SHALL execute Azure CLI commands to download pipeline logs for failed executions
5. IF authentication fails, THEN THE DevOps Automation System SHALL report the error with guidance on credential configuration

### Requirement 10

**User Story:** As a DevOps engineer, I want the system packaged as a Docker container, so that it can be deployed consistently across environments

#### Acceptance Criteria

1. THE DevOps Automation System SHALL be packaged as a Docker container image
2. THE DevOps Automation System SHALL accept configuration through environment variables including App Registration credentials, repository URL, and Azure DevOps organization
3. THE DevOps Automation System SHALL expose HTTP API endpoints for each workflow
4. THE DevOps Automation System SHALL include all required dependencies (Git, Azure CLI, Node.js, Python, OpenCode SDK) in the container image
5. THE DevOps Automation System SHALL log workflow progress and results to stdout for container log aggregation

### Requirement 11

**User Story:** As a workflow developer, I want to write instruction files that guide the OpenCode SDK, so that workflows execute the correct automation steps

#### Acceptance Criteria

1. THE DevOps Automation System SHALL support Instruction Files written in markdown format
2. THE DevOps Automation System SHALL store Instruction Files in a workflows directory with naming convention <workflow-name>-instructions.md
3. WHEN the OpenCode SDK executes a workflow, THE DevOps Automation System SHALL provide the Instruction File as context
4. THE DevOps Automation System SHALL allow Instruction Files to reference available Workflow Tools
5. THE DevOps Automation System SHALL support updating Instruction Files without redeploying the container
