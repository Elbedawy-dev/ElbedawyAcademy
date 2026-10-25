import Session from '../models/Session.js';
import Group from '../models/Group.js';
import Enrollment from '../models/Enrollment.js';
import ParentLink from '../models/ParentLink.js';
import AppError from '../utils/AppError.js';
import {
  rangesOverlap,
  localizeDates,
  toUtcDate,
  combineDateAndTime,
  DateTime,
} from '../utils/time.js';
import { sendNotificationToUser } from './notification.service.js';

export async function createSession(data, teacherId) {
  const group = await Group.findOne({ _id: data.group, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  const start = toUtcDate(data.scheduledStart);
  const end = toUtcDate(data.scheduledEnd);

  // Check for teacher session overlap
  const conflict = await Session.findOne({
    teacher: teacherId,
    status: { $ne: 'cancelled' },
    $or: [
      { scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } },
    ],
  });

  if (conflict) {
    throw AppError.badRequest(
      `Teacher has an overlapping session scheduled ("${conflict.title}")`,
      undefined,
      'SESSION_OVERLAP',
    );
  }

  const session = await Session.create({
    group: data.group,
    teacher: teacherId,
    title: data.title,
    type: data.type,
    scheduledStart: start,
    scheduledEnd: end,
    notes: data.notes,
  });

  return session;
}

export async function generateRecurringSessions(groupId, startDate, weeksAhead = 4, teacherId) {
  const group = await Group.findOne({ _id: groupId, teacher: teacherId, deletedAt: null })
    .populate('subject', 'name type');
  if (!group) throw AppError.notFound('Group not found');

  if (!group.schedule || group.schedule.length === 0) {
    throw AppError.badRequest('Group has no configured schedule slots');
  }

  const startDt = DateTime.fromJSDate(new Date(startDate)).startOf('day');
  const createdSessions = [];

  for (let w = 0; w < weeksAhead; w += 1) {
    for (const slot of group.schedule) {
      // Find calendar day matching slot.dayOfWeek in the week
      const currentDayOfWeek = (startDt.weekday % 7); // Luxon: 1=Mon...7=Sun. % 7 => 0=Sun
      let dayOffset = slot.dayOfWeek - currentDayOfWeek;
      if (dayOffset < 0) dayOffset += 7;

      const sessionDate = startDt.plus({ days: w * 7 + dayOffset });
      const dateStr = sessionDate.toISODate();

      const scheduledStart = combineDateAndTime(dateStr, slot.startTime, slot.timezone);
      const scheduledEnd = combineDateAndTime(dateStr, slot.endTime, slot.timezone);

      // Determine session type: if Sunday (0) or Thursday (4) and subject is Quran/Tajweed, label Matn if appropriate
      let type = 'lesson';
      let title = `${group.name} - حصة ${slot.startTime}`;

      if (group.subject?.type === 'quran') {
        type = 'quran';
        title = `${group.name} - حلقة قرآن`;
      } else if (group.subject?.type === 'tajweed_matn') {
        type = slot.dayOfWeek === 0 ? 'matn_tuhfa' : 'matn_jazariyyah';
        title = slot.dayOfWeek === 0 ? `${group.name} - تحفة الأطفال` : `${group.name} - الجزرية`;
      }

      // Avoid overlapping duplicates
      const exists = await Session.exists({
        group: groupId,
        teacher: teacherId,
        scheduledStart,
        status: { $ne: 'cancelled' },
      });

      if (!exists) {
        const hasCollision = await Session.exists({
          teacher: teacherId,
          status: { $ne: 'cancelled' },
          scheduledStart: { $lt: scheduledEnd },
          scheduledEnd: { $gt: scheduledStart },
        });

        if (!hasCollision) {
          const s = await Session.create({
            group: groupId,
            teacher: teacherId,
            title,
            type,
            scheduledStart,
            scheduledEnd,
            isRecurringInstance: true,
          });
          createdSessions.push(s);
        }
      }
    }
  }

  return createdSessions;
}

export async function updateSession(sessionId, updates, teacherId) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  if (updates.scheduledStart && updates.scheduledEnd) {
    const start = toUtcDate(updates.scheduledStart);
    const end = toUtcDate(updates.scheduledEnd);

    const conflict = await Session.findOne({
      _id: { $ne: sessionId },
      teacher: teacherId,
      status: { $ne: 'cancelled' },
      scheduledStart: { $lt: end },
      scheduledEnd: { $gt: start },
    });

    if (conflict) {
      throw AppError.badRequest('Overlapping session found for teacher', undefined, 'SESSION_OVERLAP');
    }

    session.scheduledStart = start;
    session.scheduledEnd = end;
  }

  if (updates.title !== undefined) session.title = updates.title;
  if (updates.type !== undefined) session.type = updates.type;
  if (updates.notes !== undefined) session.notes = updates.notes;
  if (updates.status !== undefined) session.status = updates.status;
  if (updates.cancellationReason !== undefined) session.cancellationReason = updates.cancellationReason;

  await session.save();
  return session;
}

export async function cancelSession(sessionId, teacherId, reason) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  session.status = 'cancelled';
  session.cancellationReason = reason || 'Cancelled by teacher';
  await session.save();

  // Notify all enrolled students in the group
  const enrollments = await Enrollment.find({ group: session.group, status: 'active' }).select('student');
  for (const enr of enrollments) {
    sendNotificationToUser(enr.student, {
      type: 'session_cancelled',
      data: {
        sessionTitle: session.title,
        reason: session.cancellationReason,
      },
    }).catch(() => {});
  }

  return session;
}

export async function getCalendarSessions(currentUser, { startDate, endDate, groupId, timezone }) {
  const tz = timezone || currentUser.timezone || 'Africa/Cairo';
  const start = toUtcDate(startDate, tz);
  const end = toUtcDate(endDate, tz);

  const filter = {
    scheduledStart: { $gte: start, $lte: end },
  };

  if (groupId) {
    filter.group = groupId;
  }

  if (currentUser.role === 'admin') {
    // Admin can see everything
  } else if (currentUser.role === 'teacher') {
    filter.teacher = currentUser._id;
  } else if (currentUser.role === 'student') {
    const enrollments = await Enrollment.find({
      student: currentUser._id,
      status: { $in: ['active', 'paused'] },
    }).select('group');
    const groupIds = enrollments.map((e) => e.group);
    filter.group = { $in: groupIds };
  } else if (currentUser.role === 'parent') {
    const links = await ParentLink.find({ parent: currentUser._id, status: 'accepted' }).select('student');
    const childIds = links.map((l) => l.student);
    const enrollments = await Enrollment.find({
      student: { $in: childIds },
      status: { $in: ['active', 'paused'] },
    }).select('group');
    const groupIds = enrollments.map((e) => e.group);
    filter.group = { $in: groupIds };
  }

  const sessions = await Session.find(filter)
    .populate('group', 'name subject')
    .populate('teacher', 'name avatar')
    .sort({ scheduledStart: 1 });

  return sessions.map((s) => localizeDates(s, ['scheduledStart', 'scheduledEnd'], tz));
}

export default {
  createSession,
  generateRecurringSessions,
  updateSession,
  cancelSession,
  getCalendarSessions,
};
