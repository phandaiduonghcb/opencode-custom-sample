import express from 'express';
import dotenv from 'dotenv';
import winston from 'winston';
import { join } from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { createOpencodeClient } from '@opencode-ai/sdk';
import OpenCodeExecutor from './lib/OpenCodeExecutor.js';
import { WorkflowExecutionStore } from './lib/WorkflowExecution.js';
import { listAvailableWorkflows } from './lib/instructionLoader.js';
import { AzureAuthManager } from './lib/azureAuth.js';
import {
  ValidationError,
  AuthenticationError,
  WorkflowExecutionError,
  TimeoutError,
  errorMiddleware,
  asyncHandler,
  validateRequiredFields,
  validateUrl
} from './lib/errorHandler.js';
import { logWorkflowMilestone } from './lib/logger.js';

// Load environment variables
dotenv.config();

// Configure logging infrastructure
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'devops-automation',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, executionId, sessionId, ...meta }) => {
          let metaStr = '';
          const filteredMeta = { ...meta };
          delete filteredMeta.service;
          delete filteredMeta.version;
          
          if (Object.keys(filteredMeta).length > 0) {
            metaStr = JSON.stringify(filteredMeta);
          }
          
          const contextStr = [
            executionId ? `executionId=${executionId}` : null,
            sessionId ? `sessionId=${sessionId}` : null
          ].filter(Boolean).join(' ');
          
          return `${timestamp} [${level}] ${contextStr ? `[${contextStr}] ` : ''}${message} ${metaStr}`;
        })
      )
    })
  ]
});

const app = express();
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'DevOps Automation API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    name: 'DevOps Automation API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'An extensible, containerized platform that automates DevOps workflows through AI-powered instruction files',
    documentation: {
      swagger: `${req.protocol}://${req.get('host')}/api-docs`,
      openapi: `${req.protocol}://${req.get('host')}/api-docs.json`
    },
    endpoints: {
      health: '/api/health',
      workflows: '/api/workflows',
      fixVulnerabilities: '/api/workflows/fix-vulnerabilities',
      workflowStatus: '/api/workflows/:executionId/status'
    },
    links: {
      github: 'https://github.com/your-org/devops-automation',
      documentation: 'https://github.com/your-org/devops-automation/blob/main/README.md'
    }
  });
});

// Make logger available to error middleware
app.set('logger', logger);

// Initialize OpenCode SDK
let opencodeClient;
const opencodeHost = process.env.OPENCODE_HOST || (process.env.DOCKER ? 'host.docker.internal' : 'localhost');
const opencodeBaseUrl = `http://${opencodeHost}:${process.env.OPENCODE_PORT || 4096}`;
try {
  opencodeClient = createOpencodeClient({
    baseUrl: opencodeBaseUrl,
  });
  logger.info('OpenCode client initialized', { baseUrl: opencodeBaseUrl });
} catch (error) {
  logger.error('Failed to initialize OpenCode SDK', { error: error.message });
  process.exit(1);
}

// Initialize OpenCodeExecutor and WorkflowExecutionStore
const executor = new OpenCodeExecutor(opencodeClient, logger);
const executionStore = new WorkflowExecutionStore(logger);

// Initialize Azure authentication
const azureAuth = new AzureAuthManager(logger);

// Authenticate with Azure on startup
(async () => {
  try {
    await azureAuth.login();
    logger.info('Azure CLI authentication completed successfully');
  } catch (error) {
    logger.error('Azure CLI authentication failed on startup', { error: error.message });
    logger.warn('Server will continue running, but Azure-dependent workflows may fail');
  }
})();

// Cleanup old executions periodically (every hour)
setInterval(() => {
  executionStore.cleanup();
}, 60 * 60 * 1000);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API, OpenCode SDK, and Azure CLI
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/api/health', asyncHandler(async (req, res) => {
  const azureStatus = await azureAuth.getStatus();
  
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    opencode: {
      status: opencodeClient ? 'connected' : 'disconnected',
      baseUrl: opencodeBaseUrl
    },
    azure: azureStatus
  });
}));

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: List available workflows
 *     description: Returns a list of all available workflows with their metadata
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: List of available workflows
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowsListResponse'
 */
app.get('/api/workflows', asyncHandler(async (req, res) => {
  const workflowNames = await listAvailableWorkflows('./workflows');
  const workflows = workflowNames.map(name => ({
    name,
    displayName: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    endpoint: `/api/workflows/${name}`,
    instructionFile: `${name}-instructions.md`
  }));
  res.json({ workflows });
}));

/**
 * @swagger
 * /api/workflows/{executionId}/status:
 *   get:
 *     summary: Get workflow execution status
 *     description: Returns the current status and details of a workflow execution
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique execution identifier
 *         example: abc123-def456-ghi789
 *     responses:
 *       200:
 *         description: Workflow execution status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowStatusResponse'
 *       400:
 *         description: Execution not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/workflows/:executionId/status', asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  const execution = executionStore.get(executionId);
  
  if (!execution) {
    throw new ValidationError('Execution not found', { executionId });
  }
  
  res.json(execution.toJSON());
}));

/**
 * @swagger
 * /api/workflows/fix-vulnerabilities:
 *   post:
 *     summary: Execute vulnerability fix workflow
 *     description: Starts a workflow to automatically fix security vulnerabilities in project dependencies
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FixVulnerabilitiesRequest'
 *     responses:
 *       200:
 *         description: Workflow execution started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowExecutionResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/workflows/fix-vulnerabilities', asyncHandler(async (req, res) => {
  const { prompt, repositoryUrl, targetBranch } = req.body;
  
  // Validate request body
  validateRequiredFields(req.body, ['prompt', 'repositoryUrl']);
  validateUrl(repositoryUrl, 'repositoryUrl');
  
  // Create workflow execution record
  const execution = executionStore.create('fix-vulnerabilities', {
    prompt,
    repositoryUrl,
    targetBranch: targetBranch || 'develop'
  });
  
  logger.info('Vulnerability fix workflow requested', {
    executionId: execution.executionId,
    repositoryUrl,
    targetBranch: targetBranch || 'develop'
  });
  
  // Return executionId and initial status immediately
  res.json({
    executionId: execution.executionId,
    status: execution.status,
    message: 'Workflow execution started'
  });
  
  // Execute workflow asynchronously (don't block response)
  executeWorkflowAsync(execution).catch(error => {
    logger.error('Workflow execution failed', {
      executionId: execution.executionId,
      error: error.message,
      stack: error.stack
    });
  });
}));

/**
 * Execute workflow asynchronously in the background
 * @param {WorkflowExecution} execution - The workflow execution instance
 */
async function executeWorkflowAsync(execution) {
  try {
    // Mark execution as running
    execution.start();
    logWorkflowMilestone(logger, execution.executionId, 'started', {
      workflowName: execution.workflowName,
      repositoryUrl: execution.userInput.repositoryUrl
    });
    
    // Load instruction file
    const instructionFilePath = join(process.cwd(), 'workflows', 'fix-vulnerabilities-instructions.md');
    execution.addLog('Loading instruction file', { instructionFilePath });
    
    // Create OpenCode session with instruction file
    logWorkflowMilestone(logger, execution.executionId, 'creating_session');
    const sessionId = await executor.createSession(instructionFilePath, {
      title: `Fix Vulnerabilities - ${execution.executionId}`,
      executionId: execution.executionId,
      workflowName: 'fix-vulnerabilities'
    });
    
    execution.updateContext({ sessionId });
    execution.addLog('OpenCode session created', { sessionId });
    logWorkflowMilestone(logger, execution.executionId, 'session_created', { sessionId });
    
    // Prepare user prompt with context
    const contextualPrompt = `
Repository URL: ${execution.userInput.repositoryUrl}
Target Branch: ${execution.userInput.targetBranch}

User Request:
${execution.userInput.prompt}

Please execute the vulnerability fix workflow according to the instructions.
`;
    
    execution.addLog('Executing workflow with OpenCode');
    logWorkflowMilestone(logger, execution.executionId, 'executing', { sessionId });
    
    // Execute workflow with prompt (with timeout)
    const timeoutMs = 30 * 60 * 1000; // 30 minutes
    const result = await Promise.race([
      executor.executeWithPrompt(sessionId, contextualPrompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new TimeoutError('Workflow execution timed out', { timeoutMs })), timeoutMs)
      )
    ]);
    
    execution.addLog('Workflow execution completed', { 
      resultPresent: !!result.result 
    });
    logWorkflowMilestone(logger, execution.executionId, 'execution_completed', { sessionId });
    
    // Mark execution as complete
    execution.complete({
      summary: 'Vulnerability fix workflow completed successfully',
      changes: [],
      sessionId: result.sessionId
    });
    
    logWorkflowMilestone(logger, execution.executionId, 'completed', {
      sessionId,
      duration: execution.getDuration()
    });
    
    // Cleanup session
    await executor.cleanup(sessionId);
    
  } catch (error) {
    execution.fail(error);
    
    // Log with appropriate level based on error type
    if (error instanceof TimeoutError) {
      logger.error('Workflow execution timeout', {
        executionId: execution.executionId,
        error: error.message,
        code: error.code,
        duration: execution.getDuration()
      });
      logWorkflowMilestone(logger, execution.executionId, 'timeout', {
        duration: execution.getDuration()
      });
    } else if (error instanceof AuthenticationError) {
      logger.error('Workflow authentication error', {
        executionId: execution.executionId,
        error: error.message,
        code: error.code
      });
      logWorkflowMilestone(logger, execution.executionId, 'auth_failed');
    } else {
      logger.error('Workflow execution error', {
        executionId: execution.executionId,
        error: error.message,
        stack: error.stack
      });
      logWorkflowMilestone(logger, execution.executionId, 'failed', {
        error: error.message
      });
    }
  }
}

// Legacy chat endpoint (keeping for backward compatibility)
app.post('/api/chat', asyncHandler(async (req, res) => {
  const { prompt, newSession } = req.body;
  
  validateRequiredFields(req.body, ['prompt']);

  let currentSessionId;
  
  if (newSession || !currentSessionId) {
    const sessionResponse = await opencodeClient.session.create({
      body: { title: "Chat" },
    });
    // Handle both response styles: fields (default) or data
    const session = sessionResponse.data || sessionResponse;
    currentSessionId = session.id;
    logger.info('New chat session created', { sessionId: currentSessionId });
  }
  
  const result = await opencodeClient.session.prompt({
    path: { id: currentSessionId },
    body: {
      parts: [{ type: "text", text: prompt }],
    },
  });
  
  // Extract text from parts array
  const responseData = result.data || result;
  const textParts = responseData.parts
    ?.filter(part => part.type === 'text')
    .map(part => part.text)
    .join('\n') || '';
  
  res.json({ 
    response: textParts,
    fullResponse: responseData,
    sessionId: currentSessionId
  });
}));

// Get session list
app.get('/api/sessions', asyncHandler(async (req, res) => {
  const sessions = await opencodeClient.session.list();
  res.json({ sessions });
}));

// Error handling middleware (must be last)
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`DevOps Automation API server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Workspace root: ${process.env.WORKSPACE_ROOT || '/tmp/workflows'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { app, logger, opencodeClient, executor, executionStore, azureAuth };
