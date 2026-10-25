export default class AppError extends Error {
  /**
   * @param {string} message human readable message
   * @param {number} statusCode HTTP status
   * @param {string} [code] machine readable error code
   * @param {any} [details] extra info (e.g. validation issues)
   */
  constructor(message, statusCode = 500, code = undefined, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || AppError.defaultCode(statusCode);
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static defaultCode(status) {
    const map = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      402: 'PAYMENT_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] || 'INTERNAL_ERROR';
  }

  static badRequest(message = 'Bad request', details, code) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Authentication required', code) {
    return new AppError(message, 401, code);
  }

  static paymentRequired(message = 'Active subscription required', code = 'SUBSCRIPTION_REQUIRED') {
    return new AppError(message, 402, code);
  }

  static forbidden(message = 'You do not have permission to perform this action', code) {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code) {
    return new AppError(message, 404, code);
  }

  static conflict(message = 'Conflict', details, code) {
    return new AppError(message, 409, code, details);
  }

  static validation(message = 'Validation failed', details) {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static unavailable(message = 'Service unavailable', code) {
    return new AppError(message, 503, code);
  }
}
