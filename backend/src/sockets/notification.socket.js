import { markNotificationAsRead } from '../services/notification.service.js';

export function registerNotificationHandlers(io, socket) {
  const user = socket.user;

  // Real-time mark notification as read
  socket.on('notification:read', async ({ notificationId }, ack) => {
    try {
      const updated = await markNotificationAsRead(user._id, notificationId);
      if (typeof ack === 'function') ack({ success: true, data: updated });
    } catch (err) {
      if (typeof ack === 'function') ack({ success: false, error: err.message });
    }
  });
}

export default registerNotificationHandlers;
