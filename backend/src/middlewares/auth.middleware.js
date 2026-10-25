import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/generateTokens.js';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(AppError.unauthorized('Not authenticated. Please log in.', 'AUTH_REQUIRED'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return next(AppError.unauthorized('Token expired or invalid', 'TOKEN_INVALID'));
  }

  const user = await User.findById(payload.sub).select('+isActive +passwordChangedAt');
  if (!user || user.deletedAt) {
    return next(AppError.unauthorized('User account no longer exists', 'USER_NOT_FOUND'));
  }

  if (!user.isActive) {
    return next(AppError.forbidden('Your account is deactivated', 'ACCOUNT_INACTIVE'));
  }

  if (user.passwordChangedAt) {
    const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
    if (payload.iat && payload.iat < changedTimestamp) {
      return next(
        AppError.unauthorized('Password recently changed. Please log in again.', 'PASSWORD_CHANGED'),
      );
    }
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.isActive && !user.deletedAt) {
      req.user = user;
    }
  } catch {
    // Optional auth silently ignores invalid tokens
  }

  next();
});
