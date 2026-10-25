import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as notificationService from '../services/notification.service.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead(
    req.user._id,
    req.params.id,
  );
  sendSuccess(res, { message: 'Notification marked as read', data: notification });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllNotificationsAsRead(req.user._id);
  sendSuccess(res, { message: 'All notifications marked as read' });
});

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
