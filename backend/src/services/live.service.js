import agoraTokenPkg from 'agora-token';
import agoraConfig from '../config/agora.js';
import env from '../config/env.js';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { getIO } from '../sockets/index.js';
import { recordAttendanceJoin, recordAttendanceLeave } from './attendance.service.js';

const { RtcTokenBuilder, RtcRole } = agoraTokenPkg;

class LiveProviderInterface {
  async generateToken(_channelName, _uid, _role) {
    throw new Error('Not implemented');
  }
}

class AgoraLiveProvider extends LiveProviderInterface {
  async generateToken(channelName, uid, role = 'subscriber') {
    if (!agoraConfig.isConfigured) {
      if (env.isDevelopment && env.ALLOW_MOCK_LIVE) {
        logger.warn('Agora credentials not configured. Returning mock RTC token because ALLOW_MOCK_LIVE=true in development.');
        return {
          token: `mock_agora_token_${channelName}_${uid}_${Date.now()}`,
          channelName,
          uid,
          appId: agoraConfig.appId || 'mock_app_id',
          isMock: true,
        };
      }
      throw new AppError('Live video provider is not configured', 503, 'LIVE_NOT_CONFIGURED');
    }

    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expirationTimeInSeconds = agoraConfig.tokenTtlSeconds || 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use string or numeric uid safely
    const token = RtcTokenBuilder.buildTokenWithUid(
      agoraConfig.appId,
      agoraConfig.appCertificate,
      channelName,
      Number(uid) || 0,
      agoraRole,
      privilegeExpiredTs,
      privilegeExpiredTs,
    );

    return {
      token,
      channelName,
      uid,
      appId: agoraConfig.appId,
    };
  }
}

let activeProvider = new AgoraLiveProvider();

export function setLiveProvider(provider) {
  activeProvider = provider;
}

export async function startLiveSession(sessionId, teacherId) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  if (session.status === 'ended') {
    throw AppError.badRequest('Session has already ended');
  }

  const channelName = `session_${sessionId}`;
  session.status = 'live';
  session.live = {
    channelName,
    startedAt: new Date(),
    activeAttendeesCount: 1,
  };
  await session.save();

  // Generate publisher token for teacher
  const liveCredentials = await activeProvider.generateToken(
    channelName,
    String(teacherId),
    'publisher',
  );

  // Broadcast session started to group room
  try {
    const io = getIO();
    if (io) {
      io.to(`group:${session.group}`).emit('session:started', {
        sessionId: String(session._id),
        title: session.title,
        channelName,
        teacherId: String(teacherId),
      });
    }
  } catch {
    // Non-blocking
  }

  return {
    ...liveCredentials,
    sessionId: String(session._id),
    title: session.title,
  };
}

export async function getLiveJoinToken(sessionId, currentUser) {
  const session = await Session.findById(sessionId);
  if (!session) throw AppError.notFound('Session not found');

  if (session.status !== 'live') {
    throw AppError.badRequest('Session is not currently live', undefined, 'SESSION_NOT_LIVE');
  }

  const channelName = session.live?.channelName || `session_${sessionId}`;
  const isTeacher = String(session.teacher) === String(currentUser._id);

  if (isTeacher || currentUser.role === 'admin') {
    return activeProvider.generateToken(channelName, String(currentUser._id), 'publisher');
  }

  // Verify student enrollment & active paid subscription
  if (currentUser.role === 'student') {
    const enrollment = await Enrollment.findOne({
      group: session.group,
      student: currentUser._id,
      status: { $in: ['active', 'paused'] },
    });

    if (!enrollment) {
      throw AppError.notFound('You are not enrolled in this group');
    }

    // Check subscription status
    const settings = await Settings.getSettings();
    const graceDays = settings.subscriptionGraceDays || 3;
    const now = new Date();

    if (enrollment.subscription?.endDate) {
      const gracePeriodEnd = new Date(
        enrollment.subscription.endDate.getTime() + graceDays * 24 * 60 * 60 * 1000,
      );
      if (now > gracePeriodEnd) {
        throw AppError.paymentRequired(
          'Your subscription has expired. Please renew to access live sessions.',
        );
      }
    }

    // Record presence / join attendance automatically
    await recordAttendanceJoin(sessionId, currentUser._id);

    return activeProvider.generateToken(channelName, String(currentUser._id), 'publisher');
  }

  throw AppError.forbidden('Only enrolled students and the teacher can join this live session');
}

export async function endLiveSession(sessionId, teacherId, recordingUrl) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  session.status = 'ended';
  if (session.live) {
    session.live.endedAt = new Date();
    if (recordingUrl) session.live.recordingUrl = recordingUrl;
  }
  await session.save();

  try {
    const io = getIO();
    if (io) {
      io.to(`group:${session.group}`).emit('session:ended', {
        sessionId: String(session._id),
      });
    }
  } catch {
    // Non-blocking
  }

  return session;
}

export async function kickParticipant(sessionId, teacherId, studentId) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  await recordAttendanceLeave(sessionId, studentId);

  try {
    const io = getIO();
    if (io) {
      io.to(`user:${studentId}`).emit('live:kicked', {
        sessionId: String(sessionId),
        reason: 'Removed by teacher',
      });
    }
  } catch {
    // Non-blocking
  }

  return { success: true, message: 'Student kicked from session' };
}

export async function muteParticipant(sessionId, teacherId, studentId, mute = true) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  try {
    const io = getIO();
    if (io) {
      io.to(`user:${studentId}`).emit('live:mute', {
        sessionId: String(sessionId),
        mute,
      });
    }
  } catch {
    // Non-blocking
  }

  return { success: true, message: `Student microphone ${mute ? 'muted' : 'unmuted'}` };
}

export default {
  startLiveSession,
  getLiveJoinToken,
  endLiveSession,
  kickParticipant,
  muteParticipant,
  setLiveProvider,
};
