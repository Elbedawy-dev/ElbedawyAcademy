import env from '../config/env.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

function handleCastErrorDB(err) {
  const message = `Invalid value for ${err.path}: ${err.value}`;
  return AppError.badRequest(message, undefined, 'INVALID_ID');
}

function handleDuplicateFieldsDB(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const val = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate value for '${field}': "${val}". Please use another value.`;
  return AppError.conflict(message, undefined, 'DUPLICATE_KEY');
}

function handleValidationErrorDB(err) {
  const errors = Object.values(err.errors).map((el) => ({
    path: el.path,
    message: el.message,
  }));
  return AppError.validation('Invalid input data', errors);
}

function handleJWTError() {
  return AppError.unauthorized('Invalid token. Please log in again.', 'TOKEN_INVALID');
}

function handleJWTExpiredError() {
  return AppError.unauthorized('Your token has expired. Please log in again.', 'TOKEN_EXPIRED');
}

function handleMulterError(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return AppError.badRequest('File size exceeds allowed limit', undefined, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return AppError.badRequest('Too many files uploaded', undefined, 'TOO_MANY_FILES');
  }
  return AppError.badRequest(err.message, undefined, 'UPLOAD_ERROR');
}

export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Normalize non-AppError errors
  if (!(error instanceof AppError)) {
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    else if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    else if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    else if (error.name === 'JsonWebTokenError') error = handleJWTError();
    else if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    else if (error.name === 'MulterError') error = handleMulterError(error);
    else {
      logger.error(`Unhandled error: ${error.message}`, { stack: error.stack });
      error = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
    }
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message,
    error: {
      code: error.code || AppError.defaultCode(statusCode),
      statusCode,
      details: error.details,
    },
  };

  if (!env.isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
