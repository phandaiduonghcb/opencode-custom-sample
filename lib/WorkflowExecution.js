import { randomUUID } from 'crypto';

/**
 * WorkflowExecution data model for tracking workflow execution state
 */
class WorkflowExecution {
  constructor(workflowName, userInput, context = {}) {
    this.executionId = randomUUID();
    this.workflowName = workflowName;
    this.status = 'pending'; // pending, running, success, failed
    this.startTime = new Date();
    this.endTime = null;
    this.userInput = userInput;
    this.context = context;
    this.iterations = 0;
    this.logs = [];
    this.result = null;
  }

  /**
   * Start the workflow execution
   */
  start() {
    this.status = 'running';
    this.startTime = new Date();
    this.addLog('Workflow execution started');
  }

  /**
   * Mark workflow as successful
   * @param {object} result - Execution result
   */
  complete(result) {
    this.status = 'success';
    this.endTime = new Date();
    this.result = {
      success: true,
      summary: result.summary || 'Workflow completed successfully',
      changes: result.changes || [],
      errors: []
    };
    this.addLog('Workflow execution completed successfully');
  }

  /**
   * Mark workflow as failed
   * @param {Error|string} error - Error that caused failure
   */
  fail(error) {
    this.status = 'failed';
    this.endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : error;
    this.result = {
      success: false,
      summary: 'Workflow execution failed',
      changes: [],
      errors: [errorMessage]
    };
    this.addLog(`Workflow execution failed: ${errorMessage}`);
  }

  /**
   * Add a log entry
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  addLog(message, metadata = {}) {
    const logEntry = {
      timestamp: new Date(),
      message,
      ...metadata
    };
    this.logs.push(logEntry);
    
    // Also output to stdout for container log aggregation
    console.log(JSON.stringify({
      executionId: this.executionId,
      workflowName: this.workflowName,
      ...logEntry
    }));
  }

  /**
   * Increment iteration counter
   */
  incrementIteration() {
    this.iterations++;
    this.addLog(`Starting iteration ${this.iterations}`);
  }

  /**
   * Update context
   * @param {object} updates - Context updates
   */
  updateContext(updates) {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get execution duration in milliseconds
   * @returns {number|null} - Duration or null if not ended
   */
  getDuration() {
    if (!this.endTime) {
      return Date.now() - this.startTime.getTime();
    }
    return this.endTime.getTime() - this.startTime.getTime();
  }

  /**
   * Get a summary of the execution
   * @returns {object} - Execution summary
   */
  toJSON() {
    return {
      executionId: this.executionId,
      workflowName: this.workflowName,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.getDuration(),
      userInput: this.userInput,
      context: this.context,
      iterations: this.iterations,
      logs: this.logs,
      result: this.result
    };
  }
}

/**
 * WorkflowExecutionStore manages all workflow executions
 */
class WorkflowExecutionStore {
  constructor(logger) {
    this.executions = new Map(); // executionId -> WorkflowExecution
    this.logger = logger;
  }

  /**
   * Create a new workflow execution
   * @param {string} workflowName - Name of the workflow
   * @param {object} userInput - User input for the workflow
   * @param {object} context - Additional context
   * @returns {WorkflowExecution} - New execution instance
   */
  create(workflowName, userInput, context = {}) {
    const execution = new WorkflowExecution(workflowName, userInput, context);
    this.executions.set(execution.executionId, execution);
    
    this.logger.info('Workflow execution created', {
      executionId: execution.executionId,
      workflowName
    });
    
    return execution;
  }

  /**
   * Get an execution by ID
   * @param {string} executionId - Execution ID
   * @returns {WorkflowExecution|null} - Execution or null if not found
   */
  get(executionId) {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get all executions
   * @returns {Array<WorkflowExecution>} - All executions
   */
  getAll() {
    return Array.from(this.executions.values());
  }

  /**
   * Get executions by workflow name
   * @param {string} workflowName - Workflow name
   * @returns {Array<WorkflowExecution>} - Matching executions
   */
  getByWorkflow(workflowName) {
    return this.getAll().filter(e => e.workflowName === workflowName);
  }

  /**
   * Get executions by status
   * @param {string} status - Status to filter by
   * @returns {Array<WorkflowExecution>} - Matching executions
   */
  getByStatus(status) {
    return this.getAll().filter(e => e.status === status);
  }

  /**
   * Delete old executions (cleanup)
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {number} - Number of deleted executions
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // Default: 24 hours
    const now = Date.now();
    let deleted = 0;
    
    for (const [executionId, execution] of this.executions.entries()) {
      const age = now - execution.startTime.getTime();
      if (age > maxAge && (execution.status === 'success' || execution.status === 'failed')) {
        this.executions.delete(executionId);
        deleted++;
      }
    }
    
    if (deleted > 0) {
      this.logger.info('Cleaned up old executions', { deleted });
    }
    
    return deleted;
  }
}

export { WorkflowExecution, WorkflowExecutionStore };
