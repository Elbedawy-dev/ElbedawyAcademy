import AppError from '../utils/AppError.js';

/**
 * Validates request schema across body, query, and params using Zod.
 * @param {import('zod').ZodSchema} schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) req.query = parsed.query;
    if (parsed.params !== undefined) req.params = parsed.params;

    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return next(AppError.validation('Validation error occurred', details));
    }
    next(error);
  }
};

export default validate;
