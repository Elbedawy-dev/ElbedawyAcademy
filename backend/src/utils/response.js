/**
 * Consistent JSON envelope: { success, message, data, meta }
 */
export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendCreated(res, { message = 'Created', data = null, meta } = {}) {
  return sendSuccess(res, { statusCode: 201, message, data, meta });
}

export default sendSuccess;
