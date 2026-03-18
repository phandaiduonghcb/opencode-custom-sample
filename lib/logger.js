/**
 * Logging utilities for structured logging with context
 */

/**
 * Create a child logger with execution context
 * @param {object} logger - Winston logger instance
 * @param {object} context - Context to add to all log messages
 * @returns {object} - Child logger with context
 */
export function createContextLogger(logger, context = {}) {
  return {
    info: (message, meta = {}) => {
      logger.info(message, { ...context, ...meta });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { ...context, ...meta });
    },
    error: (message, meta = {}) => {
      logger.error(message, { ...context, ...meta });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, { ...context, ...meta });
    }
  };
}

/**
 * Log Azure CLI command execution
 * @param {object} logger - Logger instance
 * @param {string} command - Command being executed
 * @param {object} context - Additional context
 */
export function logAzureCommand(logger, command, context = {}) {
  // Sanitize command to hide secrets
  const sanitizedCommand = command
    .replace(/-p\s+\S+/g, '-p ***')
    .replace(/--password\s+\S+/g, '--password ***')
    .replace(/clientSecret[=:]\s*\S+/gi, 'clientSecret=***');
  
  logger.info('Executing Azure CLI command', {
    command: sanitizedCommand,
    ...context
  });
}

/**
 * Log OpenCode SDK interaction
 * @param {object} logger - Logger instance
 * @param {string} operation - Operation being performed
 * @param {object} details - Operation details
 * @param {object} context - Additional context
 */
export function logOpencodeInteraction(logger, operation, details = {}, context = {}) {
  logger.info('OpenCode SDK interaction', {
    operation,
    ...details,
    ...context
  });
}

/**
 * Log workflow execution milestone
 * @param {object} logger - Logger instance
 * @param {string} executionId - Execution ID
 * @param {string} milestone - Milestone name
 * @param {object} details - Additional details
 */
export function logWorkflowMilestone(logger, executionId, milestone, details = {}) {
  logger.info(`Workflow milestone: ${milestone}`, {
    executionId,
    milestone,
    ...details
  });
}
