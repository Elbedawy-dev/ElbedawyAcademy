import { recordAttendanceJoin, recordAttendanceLeave } from '../services/attendance.service.js';
import Session from '../models/Session.js';
import logger from '../utils/logger.js';

export function registerLiveHandlers(io, socket) {
  const user = socket.user;

  // Student joins live session room
  socket.on('live:join', async ({ sessionId }, ack) => {
    try {
      socket.join(`live:${sessionId}`);

      // Track presence in database
      if (user.role === 'student') {
        await recordAttendanceJoin(sessionId, user._id);
      }

      await Session.findByIdAndUpdate(sessionId, {
        $inc: { 'live.activeAttendeesCount': 1 },
      });

      // Broadcast attendance update to everyone in this session
      io.to(`live:${sessionId}`).emit('presence:update', {
        sessionId,
        userId: String(user._id),
        name: user.name,
        action: 'joined',
      });

      if (typeof ack === 'function') ack({ success: true });
    } catch (err) {
      logger.error(`live:join socket error: ${err.message}`);
      if (typeof ack === 'function') ack({ success: false, error: err.message });
    }
  });

  // Student leaves live session room
  socket.on('live:leave', async ({ sessionId }, ack) => {
    try {
      socket.leave(`live:${sessionId}`);

      if (user.role === 'student') {
        await recordAttendanceLeave(sessionId, user._id);
      }

      await Session.findByIdAndUpdate(sessionId, {
        $inc: { 'live.activeAttendeesCount': -1 },
      });

      io.to(`live:${sessionId}`).emit('presence:update', {
        sessionId,
        userId: String(user._id),
        name: user.name,
        action: 'left',
      });

      if (typeof ack === 'function') ack({ success: true });
    } catch (err) {
      logger.error(`live:leave socket error: ${err.message}`);
      if (typeof ack === 'function') ack({ success: false, error: err.message });
    }
  });
}

export default registerLiveHandlers;
