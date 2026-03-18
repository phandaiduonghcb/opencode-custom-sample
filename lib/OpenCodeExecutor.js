import { readFile } from 'fs/promises';
import { WorkflowExecutionError } from './errorHandler.js';
import { logOpencodeInteraction } from './logger.js';

/**
 * OpenCodeExecutor manages OpenCode SDK sessions for workflow execution
 */
class OpenCodeExecutor {
  constructor(opencodeClient, logger) {
    this.opencodeClient = opencodeClient;
    this.logger = logger;
    this.sessions = new Map(); // sessionId -> session metadata
  }

  /**
   * Create a new OpenCode session with instruction file loaded as context
   * @param {string} instructionFile - Path to the instruction markdown file
   * @param {object} context - Additional context for the session
   * @returns {Promise<string>} - Session ID
   * @throws {WorkflowExecutionError} If session creation fails
   */
  async createSession(instructionFile, context = {}) {
    try {
      // Load instruction file content
      const instructionContent = await readFile(instructionFile, 'utf-8');
      
      logOpencodeInteraction(
        this.logger,
        'load_instruction_file',
        { instructionFile, contentLength: instructionContent.length },
        { executionId: context.executionId }
      );

      // Create OpenCode session with instruction file as system context
      logOpencodeInteraction(
        this.logger,
        'create_session',
        { title: context.title || 'Workflow Execution' },
        { executionId: context.executionId }
      );
      
      const sessionResponse = await this.opencodeClient.session.create({
        body: { 
          title: context.title || 'Workflow Execution'
        }
      });

      // Handle both response styles: fields (default) or data
      const session = sessionResponse.data || sessionResponse;
      const sessionId = session.id;
      
      if (!sessionId) {
        throw new WorkflowExecutionError('Failed to create session: no session ID returned');
      }

      // Inject instruction content as context without triggering AI response
      logOpencodeInteraction(
        this.logger,
        'inject_instruction_context',
        { sessionId, contentLength: instructionContent.length },
        { executionId: context.executionId, sessionId }
      );

      await this.opencodeClient.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [{ type: 'text', text: instructionContent }]
        }
      });

      // Store session metadata
      this.sessions.set(sessionId, {
        sessionId,
        instructionFile,
        context,
        createdAt: new Date(),
        status: 'active'
      });

      logOpencodeInteraction(
        this.logger,
        'session_created',
        { sessionId, instructionFile },
        { executionId: context.executionId, sessionId }
      );

      return sessionId;
    } catch (error) {
      this.logger.error('Failed to create OpenCode session', { 
        error: error.message,
        stack: error.stack,
        instructionFile,
        executionId: context.executionId
      });
      
      if (error instanceof WorkflowExecutionError) {
        throw error;
      }
      
      throw new WorkflowExecutionError(
        `Failed to create OpenCode session: ${error.message}`,
        { instructionFile, originalError: error.message }
      );
    }
  }

  /**
   * Execute a workflow by sending user prompt to an existing session
   * @param {string} sessionId - The session ID
   * @param {string} userPrompt - User input/prompt for the workflow
   * @returns {Promise<object>} - Execution result
   * @throws {WorkflowExecutionError} If execution fails
   */
  async executeWithPrompt(sessionId, userPrompt) {
    try {
      const sessionMeta = this.sessions.get(sessionId);
      
      if (!sessionMeta) {
        throw new WorkflowExecutionError(`Session ${sessionId} not found`, { sessionId });
      }

      if (sessionMeta.status !== 'active') {
        throw new WorkflowExecutionError(
          `Session ${sessionId} is not active (status: ${sessionMeta.status})`,
          { sessionId, status: sessionMeta.status }
        );
      }

      logOpencodeInteraction(
        this.logger,
        'send_prompt',
        { sessionId, promptLength: userPrompt.length },
        { executionId: sessionMeta.context.executionId, sessionId }
      );

      // Send prompt to OpenCode session
      const result = await this.opencodeClient.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: 'text', text: userPrompt }]
        }
      });

      logOpencodeInteraction(
        this.logger,
        'prompt_completed',
        { sessionId, resultData: result.data ? 'present' : 'missing' },
        { executionId: sessionMeta.context.executionId, sessionId }
      );

      return {
        sessionId,
        result: result.data,
        timestamp: new Date()
      };
    } catch (error) {
      const sessionMeta = this.sessions.get(sessionId);
      this.logger.error('Failed to execute workflow', { 
        error: error.message,
        stack: error.stack,
        sessionId,
        executionId: sessionMeta?.context?.executionId
      });
      
      if (error instanceof WorkflowExecutionError) {
        throw error;
      }
      
      throw new WorkflowExecutionError(
        `Failed to execute workflow: ${error.message}`,
        { sessionId, originalError: error.message }
      );
    }
  }

  /**
   * Get session metadata
   * @param {string} sessionId - The session ID
   * @returns {object|null} - Session metadata or null if not found
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Cleanup a session
   * @param {string} sessionId - The session ID to cleanup
   */
  async cleanup(sessionId) {
    try {
      const sessionMeta = this.sessions.get(sessionId);
      
      if (sessionMeta) {
        sessionMeta.status = 'closed';
        
        logOpencodeInteraction(
          this.logger,
          'session_cleanup',
          { sessionId },
          { executionId: sessionMeta.context?.executionId, sessionId }
        );
      }

      // Note: OpenCode SDK may not have explicit session deletion
      // We just mark it as closed in our tracking
    } catch (error) {
      this.logger.error('Failed to cleanup session', { 
        error: error.message,
        sessionId 
      });
    }
  }

  /**
   * Get all active sessions
   * @returns {Array} - Array of session metadata
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }
}

export default OpenCodeExecutor;
