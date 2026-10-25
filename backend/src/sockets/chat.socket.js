import { sendMessage, markMessagesAsRead } from '../services/chat.service.js';
import logger from '../utils/logger.js';

export function registerChatHandlers(io, socket) {
  const user = socket.user;

  // Real-time message sending
  socket.on('chat:send', async (data, ack) => {
    try {
      const { groupId, content, replyTo } = data;
      const message = await sendMessage(groupId, user._id, { content, replyTo });

      if (typeof ack === 'function') {
        ack({ success: true, data: message });
      }
    } catch (err) {
      logger.error(`chat:send error: ${err.message}`);
      if (typeof ack === 'function') {
        ack({ success: false, error: err.message });
      }
    }
  });

  // Typing indicators
  socket.on('chat:typing', ({ groupId, isTyping }) => {
    socket.to(`group:${groupId}`).emit('chat:typing', {
      groupId,
      userId: String(user._id),
      userName: user.name,
      isTyping: Boolean(isTyping),
    });
  });

  // Read receipts acknowledgment
  socket.on('chat:read', async ({ groupId }) => {
    try {
      await markMessagesAsRead(groupId, user._id);
    } catch (err) {
      logger.error(`chat:read error: ${err.message}`);
    }
  });
}

export default registerChatHandlers;
