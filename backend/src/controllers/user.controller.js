import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import * as userService from '../services/user.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user._id);
  sendSuccess(res, { data: user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateMe(req.user._id, req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess(res, { message: 'Profile updated successfully', data: user });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.badRequest('No image file uploaded');
  const user = await userService.updateAvatar(req.user._id, req.file.buffer);
  sendSuccess(res, { message: 'Avatar updated successfully', data: user });
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await userService.deleteAvatar(req.user._id);
  sendSuccess(res, { message: 'Avatar removed successfully', data: user });
});

export const adminListUsers = asyncHandler(async (req, res) => {
  const result = await userService.adminListUsers(req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const adminGetUserById = asyncHandler(async (req, res) => {
  const user = await userService.adminGetUserById(req.params.id);
  sendSuccess(res, { data: user });
});

export const adminUpdateUser = asyncHandler(async (req, res) => {
  const user = await userService.adminUpdateUser(req.params.id, req.body, req.user, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess(res, { message: 'User updated successfully', data: user });
});

export const adminToggleActive = asyncHandler(async (req, res) => {
  const user = await userService.adminToggleActive(
    req.params.id,
    req.body.isActive,
    req.user,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: 'User status updated', data: user });
});

export const adminDeleteUser = asyncHandler(async (req, res) => {
  const result = await userService.adminDeleteUser(req.params.id, req.user, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  sendSuccess(res, { message: result.message });
});

export default {
  getMe,
  updateMe,
  updateAvatar,
  deleteAvatar,
  adminListUsers,
  adminGetUserById,
  adminUpdateUser,
  adminToggleActive,
  adminDeleteUser,
};
