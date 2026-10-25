import { Server } from 'socket.io';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/generateTokens.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Group from '../models/Group.js';
import ParentLink from '../models/ParentLink.js';
import { registerChatHandlers } from './chat.socket.js';
import { registerLiveHandlers } from './live.socket.js';
import { registerNotificationHandlers } from './notification.socket.js';

let io = null;

export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication Handshake Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);

      if (!user || user.deletedAt || !user.isActive) {
        return next(new Error('User unauthorized or inactive'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${err.message}`);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.name} (${user._id})`);

    // 1. Join user personal room for private notifications
    socket.join(`user:${user._id}`);

    // 2. Auto-join rooms for groups the user belongs to
    try {
      let groupIds = [];

      if (user.role === 'teacher') {
        const groups = await Group.find({ teacher: user._id, deletedAt: null }).select('_id');
        groupIds = groups.map((g) => String(g._id));
      } else if (user.role === 'student') {
        const enrollments = await Enrollment.find({
          student: user._id,
          status: { $in: ['active', 'paused'] },
        }).select('group');
        groupIds = enrollments.map((e) => String(e.group));
      } else if (user.role === 'parent') {
        const links = await ParentLink.find({ parent: user._id, status: 'accepted' }).select('student');
        const childIds = links.map((l) => l.student);
        const enrollments = await Enrollment.find({
          student: { $in: childIds },
          status: { $in: ['active', 'paused'] },
        }).select('group');
        groupIds = enrollments.map((e) => String(e.group));
      }

      for (const gid of groupIds) {
        socket.join(`group:${gid}`);
      }
    } catch (err) {
      logger.error(`Error joining group rooms: ${err.message}`);
    }

    // Register event modules
    registerChatHandlers(io, socket);
    registerLiveHandlers(io, socket);
    registerNotificationHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${user.name} (${reason})`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export default { initSocketIO, getIO };
