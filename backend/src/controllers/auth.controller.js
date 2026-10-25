import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendCreated(res, {
    message: 'User registered successfully. Please verify your email.',
    data: result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess(res, {
    message: 'Login successful',
    data: result,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess(res, {
    message: 'Token refreshed successfully',
    data: result,
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id, req.body.refreshToken);
  sendSuccess(res, { message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  sendSuccess(res, { message: 'All sessions logged out successfully' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.query.token);
  sendSuccess(res, { message: result.message });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: result.message });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, { message: result.message });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  sendSuccess(res, { message: result.message });
});

export const updateFcmToken = asyncHandler(async (req, res) => {
  await authService.updateFcmToken(req.user._id, req.body.fcmToken);
  sendSuccess(res, { message: 'FCM token updated successfully' });
});

export default {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  updateFcmToken,
};
