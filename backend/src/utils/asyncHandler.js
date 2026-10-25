/**
 * Wraps an async express handler so rejected promises reach the error middleware.
 */
const asyncHandler = (fn) =>
  function asyncHandlerWrapper(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
