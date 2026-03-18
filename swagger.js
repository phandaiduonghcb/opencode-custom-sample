import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevOps Automation API',
      version: '1.0.0',
      description: 'An extensible, containerized platform that automates DevOps workflows through AI-powered instruction files',
      contact: {
        name: 'API Support',
        email: 'devops-automation@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3001',
        description: 'Alternative development server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check and system status endpoints'
      },
      {
        name: 'Workflows',
        description: 'Workflow management and execution endpoints'
      },
      {
        name: 'Sessions',
        description: 'OpenCode session management (legacy)'
      }
    ],
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'healthy',
              description: 'Overall system health status'
            },
            version: {
              type: 'string',
              example: '1.0.0',
              description: 'API version'
            },
            opencode: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  example: 'connected',
                  description: 'OpenCode SDK connection status'
                },
                baseUrl: {
                  type: 'string',
                  example: 'http://localhost:4096',
                  description: 'OpenCode SDK base URL'
                }
              }
            },
            azure: {
              type: 'object',
              properties: {
                authenticated: {
                  type: 'boolean',
                  example: true,
                  description: 'Azure CLI authentication status'
                },
                tenantId: {
                  type: 'string',
                  example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                  description: 'Azure tenant ID'
                },
                subscriptionId: {
                  type: 'string',
                  example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                  description: 'Azure subscription ID'
                },
                subscriptionName: {
                  type: 'string',
                  example: 'My Subscription',
                  description: 'Azure subscription name'
                },
                devopsOrg: {
                  type: 'string',
                  example: 'my-organization',
                  description: 'Azure DevOps organization'
                },
                devopsProject: {
                  type: 'string',
                  example: 'my-project',
                  description: 'Azure DevOps project'
                }
              }
            }
          }
        },
        WorkflowInfo: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'fix-vulnerabilities',
              description: 'Workflow identifier'
            },
            displayName: {
              type: 'string',
              example: 'Fix Vulnerabilities',
              description: 'Human-readable workflow name'
            },
            endpoint: {
              type: 'string',
              example: '/api/workflows/fix-vulnerabilities',
              description: 'API endpoint for this workflow'
            },
            instructionFile: {
              type: 'string',
              example: 'fix-vulnerabilities-instructions.md',
              description: 'Instruction file name'
            }
          }
        },
        WorkflowsListResponse: {
          type: 'object',
          properties: {
            workflows: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/WorkflowInfo'
              }
            }
          }
        },
        FixVulnerabilitiesRequest: {
          type: 'object',
          required: ['prompt', 'repositoryUrl'],
          properties: {
            prompt: {
              type: 'string',
              example: 'Fix CVE-2021-44228 in log4j. Update log4j-core from 2.14.0 to 2.17.1',
              description: 'User prompt describing the vulnerability to fix'
            },
            repositoryUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://dev.azure.com/myorg/myproject/_git/myrepo',
              description: 'Azure DevOps repository URL'
            },
            targetBranch: {
              type: 'string',
              example: 'develop',
              default: 'develop',
              description: 'Target branch for the pull request'
            }
          }
        },
        WorkflowExecutionResponse: {
          type: 'object',
          properties: {
            executionId: {
              type: 'string',
              example: 'abc123-def456-ghi789',
              description: 'Unique execution identifier'
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'success', 'failed'],
              example: 'running',
              description: 'Current execution status'
            },
            message: {
              type: 'string',
              example: 'Workflow execution started',
              description: 'Status message'
            }
          }
        },
        LogEntry: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-08T10:30:00.000Z',
              description: 'Log entry timestamp'
            },
            message: {
              type: 'string',
              example: 'Workflow execution started',
              description: 'Log message'
            }
          }
        },
        WorkflowResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Whether the workflow completed successfully'
            },
            summary: {
              type: 'string',
              example: 'Fixed 2 vulnerabilities',
              description: 'Summary of the workflow execution'
            },
            changes: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Updated log4j from 2.14.0 to 2.17.1', 'Updated jackson-databind from 2.12.0 to 2.13.4'],
              description: 'List of changes made'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: [],
              description: 'List of errors encountered'
            }
          }
        },
        WorkflowStatusResponse: {
          type: 'object',
          properties: {
            executionId: {
              type: 'string',
              example: 'abc123-def456-ghi789',
              description: 'Unique execution identifier'
            },
            workflowName: {
              type: 'string',
              example: 'fix-vulnerabilities',
              description: 'Workflow name'
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'success', 'failed'],
              example: 'success',
              description: 'Current execution status'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-08T10:30:00.000Z',
              description: 'Execution start time'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-03-08T10:35:00.000Z',
              description: 'Execution end time (null if still running)'
            },
            duration: {
              type: 'number',
              example: 300000,
              description: 'Execution duration in milliseconds'
            },
            userInput: {
              type: 'object',
              description: 'Original user input'
            },
            context: {
              type: 'object',
              properties: {
                sessionId: {
                  type: 'string',
                  example: 'session-abc123',
                  description: 'OpenCode session ID'
                }
              },
              description: 'Execution context'
            },
            iterations: {
              type: 'number',
              example: 0,
              description: 'Number of iterations executed'
            },
            logs: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/LogEntry'
              },
              description: 'Execution logs'
            },
            result: {
              $ref: '#/components/schemas/WorkflowResult',
              nullable: true,
              description: 'Execution result (null if still running)'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  example: 'Missing required fields: prompt, repositoryUrl',
                  description: 'Error message'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-03-08T10:30:00.000Z',
                  description: 'Error timestamp'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details'
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
