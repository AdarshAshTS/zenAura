const ErrorCodes = {
  // Client Errors (4xx)
  BAD_REQUEST: { code: 'BAD_REQUEST', status: 400, message: 'Invalid request data' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: 'Authentication required' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Resource not found' },
  CONFLICT: { code: 'CONFLICT', status: 409, message: 'Resource already exists or conflict occurred' },
  UNPROCESSABLE_ENTITY: { code: 'UNPROCESSABLE_ENTITY', status: 422, message: 'Validation failed' },

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: { code: 'INTERNAL_SERVER_ERROR', status: 500, message: 'An unexpected server error occurred' },
  NOT_IMPLEMENTED: { code: 'NOT_IMPLEMENTED', status: 501, message: 'Feature not implemented' },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503, message: 'Service temporarily unavailable' },

  // Custom/Database Errors
  DB_CONNECTION_ERROR: { code: 'DB_CONNECTION_ERROR', status: 500, message: 'Database connection failed' },
  DB_RECORD_NOT_FOUND: { code: 'DB_RECORD_NOT_FOUND', status: 404, message: 'Database record not found' },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400, message: 'Data validation failed' }
};

class AppError extends Error {
  constructor(errorType, customMessage = null) {
    super(customMessage || errorType.message);
    this.code = errorType.code;
    this.status = errorType.status;
    this.isOperational = true; // Helps distinguish operational errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  ErrorCodes,
  AppError
};
