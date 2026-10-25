import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import ParentLink from '../models/ParentLink.js';
import AppError from '../utils/AppError.js';
import { sendNotificationToUser } from './notification.service.js';

export async function recordAttendanceJoin(sessionId, studentId) {
  const session = await Session.findById(sessionId);
  if (!session) return null;

  let attendance = await Attendance.findOne({ session: sessionId, student: studentId });
  const now = new Date();

  // If student joins more than 15 minutes after scheduled start, mark as late
  const scheduledTime = session.scheduledStart ? new Date(session.scheduledStart).getTime() : now.getTime();
  const isLate = (now.getTime() - scheduledTime) > 15 * 60 * 1000;

  if (!attendance) {
    attendance = await Attendance.create({
      session: sessionId,
      student: studentId,
      status: isLate ? 'late' : 'present',
      joinedAt: now,
      markedAutomatically: true,
    });
  } else {
    attendance.joinedAt = now;
    if (attendance.status === 'absent') {
      attendance.status = isLate ? 'late' : 'present';
    }
    await attendance.save();
  }

  return attendance;
}

export async function recordAttendanceLeave(sessionId, studentId) {
  const attendance = await Attendance.findOne({ session: sessionId, student: studentId });
  if (!attendance) return null;

  const now = new Date();
  attendance.leftAt = now;

  if (attendance.joinedAt) {
    const minutes = Math.round((now.getTime() - new Date(attendance.joinedAt).getTime()) / 60000);
    attendance.durationMinutes = (attendance.durationMinutes || 0) + minutes;
  }

  await attendance.save();
  return attendance;
}

export async function manualEditAttendance(sessionId, studentId, teacherId, status, note) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  let attendance = await Attendance.findOne({ session: sessionId, student: studentId });
  if (!attendance) {
    attendance = new Attendance({
      session: sessionId,
      student: studentId,
      status,
      note,
      markedAutomatically: false,
    });
  } else {
    attendance.status = status;
    if (note !== undefined) attendance.note = note;
    attendance.markedAutomatically = false;
  }

  await attendance.save();

  // If marked absent, send absence alert to linked parent(s)
  if (status === 'absent') {
    const [studentUser, parentLinks] = await Promise.all([
      User.findById(studentId),
      ParentLink.find({ student: studentId, status: 'accepted' }),
    ]);

    for (const pl of parentLinks) {
      sendNotificationToUser(pl.parent, {
        type: 'absence_alert',
        data: {
          studentName: studentUser?.name || 'طالبك',
          sessionTitle: session.title,
        },
      }).catch(() => {});
    }
  }

  return attendance;
}

export async function getSessionAttendance(sessionId, teacherId) {
  const session = await Session.findOne({ _id: sessionId, teacher: teacherId });
  if (!session) throw AppError.notFound('Session not found');

  const attendances = await Attendance.find({ session: sessionId })
    .populate('student', 'name avatar gender');

  return attendances;
}

export async function getStudentAttendanceReport(studentId, currentUser) {
  // Authorization check: student themselves, teacher, linked parent, or admin
  if (currentUser.role === 'student' && String(currentUser._id) !== String(studentId)) {
    throw AppError.notFound('Attendance not found');
  }

  if (currentUser.role === 'parent') {
    const isLinked = await ParentLink.exists({ parent: currentUser._id, student: studentId, status: 'accepted' });
    if (!isLinked) throw AppError.notFound('Attendance not found');
  }

  const attendances = await Attendance.find({ student: studentId })
    .populate({
      path: 'session',
      select: 'title scheduledStart type group',
      populate: { path: 'group', select: 'name' },
    })
    .sort({ createdAt: -1 });

  const total = attendances.length;
  const present = attendances.filter((a) => a.status === 'present').length;
  const late = attendances.filter((a) => a.status === 'late').length;
  const absent = attendances.filter((a) => a.status === 'absent').length;
  const excused = attendances.filter((a) => a.status === 'excused').length;

  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  return {
    summary: { total, present, late, absent, excused, attendanceRate },
    records: attendances,
  };
}

export async function getGroupAttendanceReport(groupId, teacherId) {
  const group = await Group.findOne({ _id: groupId, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  const sessions = await Session.find({ group: groupId }).select('_id title scheduledStart');
  const sessionIds = sessions.map((s) => s._id);

  const attendances = await Attendance.find({ session: { $in: sessionIds } })
    .populate('student', 'name avatar');

  return {
    group: { id: String(group._id), name: group.name },
    totalSessions: sessions.length,
    attendances,
  };
}

export default {
  recordAttendanceJoin,
  recordAttendanceLeave,
  manualEditAttendance,
  getSessionAttendance,
  getStudentAttendanceReport,
  getGroupAttendanceReport,
};
