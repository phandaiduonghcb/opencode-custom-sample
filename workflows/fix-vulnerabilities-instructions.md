# Vulnerability Fix Workflow

## Objective
Automatically fix security vulnerabilities in project dependencies by updating package versions, creating a pull request, and validating changes through CI/CD pipeline.

---

## Workflow Steps
### 0. Authenticate AZ CLI if necessary
- Use scripts\azure-devops\authenticate-az-cli.sh

### 1. Analyze Vulnerability Requirements
- Extract package names and required version constraints from the user prompt
- Identify all packages that need updates
- Document the vulnerability details for the commit message

### 2. Clone Repository
- Execute: `scripts/clone-repo.sh` with credentials from `credentials/.env`
- Clone to a temporary workspace directory
- Verify successful clone

### 3. Create Feature branch from the target branch
- Create new branch fromn the target branch with format: `ai/<branch-name>` use git checkout <target-branch> && git checkout -b ai/<branch-name>


### 4. Identify Dependency Files
- Locate dependency files in the repository:
  - Python: `requirements.txt`, `Pipfile`, `pyproject.toml`
  - Node.js: `package.json`
  - Java: `pom.xml`, `build.gradle`
  - .NET: `*.csproj`, `packages.config`
- Read current file content

### 5. Update Package Versions
- Modify dependency files with secure version constraints
- Preserve file formatting and structure

### 6. Commit and Push Changes
- Stage modified files
- Commit with message
- Push branch to remote repository (ok to force if it starts with ai/)
- Verify push success

### 7. Create Pull Request
- Create PR targeting the specified branch (e.g., `dev`) using scripts\azure-devops\create-pr.sh

### 8. Trigger and Monitor Pipeline
- Make use of scripts\azure-devops\trigger-and-monitor-pipeline.sh
- If pipeline **FAILS**:
  - Retrieve and analyze pipeline logs
  - Identify the root cause
  - Fix the issue in the code
  - Commit and push the fix
  - Wait for automatic pipeline trigger or trigger manually
  - Repeat until success or max 3 attempts reached => proceed to next step
- If pipeline **SUCCEEDS**: Proceed to next step

### 9. Cleanup
- Delete the cloned repository from local workspace
- Remove temporary files and directories

### 10. Document Execution [Optional - Only execute when user tells you to]
- Create a summary document in `documentation/scripts/`
- Filename format: `vulnerability-fix-workflow-<date>.md`
- Include:
  - Date and repository URL
  - Target branch
  - List of vulnerabilities fixed
  - Detailed steps executed
  - PR and pipeline links
  - Final status

---

## Important Notes

- **Isolation**: All operations must be performed inside the cloned repository
- **Environment**: Use isolated environments (virtual env, containers) when testing
- **Cleanup**: Always delete cloned repositories after completion
- **Retry Logic**: Maximum 3 commit attempts for pipeline fixes
- **Authentication**: Use Azure Service Principal from `credentials/.env`
- **Branch Naming**: Always use `ai/` prefix for automated branches

---

## Error Handling

- If clone fails: Check Azure credentials and repository URL
- If branch creation fails: Verify target branch exists
- If dependency file not found: Check repository structure
- If pipeline fails repeatedly: Stop after 3 attempts
- If PR creation fails: Check Azure DevOps permissions

---

## Success Criteria

- ✅ All specified packages updated with correct version constraints
- ✅ Pull request created successfully
- ✅ Pipeline build passes (status: SUCCEEDED)
- ✅ Documentation generated [Optional]
- ✅ Workspace cleaned up