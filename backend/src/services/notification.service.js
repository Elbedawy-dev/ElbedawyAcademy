import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getMessaging, isFirebaseConfigured } from '../config/firebase.js';
import { renderNotification } from '../utils/notificationTemplates.js';
import logger from '../utils/logger.js';
import { getIO } from '../sockets/index.js';

export async function sendNotificationToUser(userId, { type, title, body, data = {} }) {
  const user = await User.findById(userId).select('+fcmTokens language');
  if (!user) return null;

  let finalTitle = title;
  let finalBody = body;

  if (!finalTitle || !finalBody) {
    const rendered = renderNotification(type, data, user.language || 'ar');
    finalTitle = rendered.title;
    finalBody = rendered.body;
  }

  // 1. In-app notification
  const notification = await Notification.create({
    user: userId,
    type,
    title: finalTitle,
    body: finalBody,
    data,
  });

  // 2. Realtime socket event
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }
  } catch {
    // Socket emit failure should not block operation
  }

  // 3. FCM Push Notifications
  if (isFirebaseConfigured && user.fcmTokens && user.fcmTokens.length > 0) {
    const messaging = getMessaging();
    if (messaging) {
      const payload = {
        notification: {
          title: finalTitle,
          body: finalBody,
        },
        data: {
          type: String(type),
          notificationId: String(notification._id),
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]),
          ),
        },
      };

      try {
        const response = await messaging.sendEachForMulticast({
          tokens: user.fcmTokens,
          ...payload,
        });

        // Clean up invalid or expired tokens
        if (response.failureCount > 0) {
          const validTokens = [];
          response.responses.forEach((resp, idx) => {
            if (resp.success) {
              validTokens.push(user.fcmTokens[idx]);
            }
          });
          await User.findByIdAndUpdate(userId, { fcmTokens: validTokens });
        }
      } catch (fcmError) {
        logger.error(`FCM send failed for user ${userId}: ${fcmError.message}`);
      }
    }
  }

  return notification;
}

export async function getUserNotifications(userId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { user: userId };
  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === 'true';
  }

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    },
  };
}

export async function markNotificationAsRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true, readAt: new Date() },
    { new: true },
  );
}

export async function markAllNotificationsAsRead(userId) {
  return Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );
}

export default {
  sendNotificationToUser,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
