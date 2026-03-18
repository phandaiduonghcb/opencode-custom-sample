/**
 * Error handling utilities for consistent error responses
 */

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.code = 'AUTH_ERROR';
    this.details = details;
  }
}

export class WorkflowExecutionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'WorkflowExecutionError';
    this.statusCode = 500;
    this.code = 'WORKFLOW_EXECUTION_ERROR';
    this.details = details;
  }
}

export class TimeoutError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'TimeoutError';
    this.statusCode = 504;
    this.code = 'TIMEOUT_ERROR';
    this.details = details;
  }
}

/**
 * Format error response consistently
 * @param {Error} error - The error object
 * @returns {object} - Formatted error response
 */
export function formatErrorResponse(error) {
  const response = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  };

  // Include details if available
  if (error.details && Object.keys(error.details).length > 0) {
    response.error.details = error.details;
  }

  return response;
}

/**
 * Express error handling middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
export function errorMiddleware(err, req, res, next) {
  // Log the error
  const logger = req.app.get('logger');
  if (logger) {
    logger.error('Request error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode || 500
    });
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Send formatted error response
  res.status(statusCode).json(formatErrorResponse(err));
}

/**
 * Async route handler wrapper to catch errors
 * @param {function} fn - Async route handler function
 * @returns {function} - Wrapped handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate required fields in request body
 * @param {object} body - Request body
 * @param {Array<string>} requiredFields - List of required field names
 * @throws {ValidationError} If validation fails
 */
export function validateRequiredFields(body, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If URL is invalid
 */
export function validateUrl(url, fieldName = 'url') {
  try {
    new URL(url);
  } catch (error) {
    throw new ValidationError(
      `Invalid ${fieldName}: must be a valid URL`,
      { field: fieldName, value: url }
    );
  }
}
