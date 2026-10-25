import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Group from '../models/Group.js';
import Enrollment from '../models/Enrollment.js';
import ParentLink from '../models/ParentLink.js';
import Session from '../models/Session.js';

/**
 * Checks if the user is the teacher of the specified group or admin.
 * Returns 404 if not found or unauthorized to prevent resource leaking.
 */
export const isGroupTeacher = asyncHandler(async (req, res, next) => {
  const groupId = req.params.groupId || req.params.id || req.body.group;
  if (!groupId) {
    return next(AppError.notFound('Group not found'));
  }

  if (req.user.role === 'admin') {
    const group = await Group.findOne({ _id: groupId, deletedAt: null });
    if (!group) return next(AppError.notFound('Group not found'));
    req.group = group;
    return next();
  }

  const group = await Group.findOne({
    _id: groupId,
    teacher: req.user._id,
    deletedAt: null,
  });

  if (!group) {
    return next(AppError.notFound('Group not found'));
  }

  req.group = group;
  next();
});

/**
 * Checks if user is the teacher of the group, an active enrolled student,
 * a linked parent of an active student, or an admin.
 * Returns 404 if unauthorized or group not found.
 */
export const isGroupMemberOrTeacher = asyncHandler(async (req, res, next) => {
  const groupId = req.params.groupId || req.params.id || req.body.group;
  if (!groupId) return next(AppError.notFound('Group not found'));

  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group) return next(AppError.notFound('Group not found'));

  if (req.user.role === 'admin') {
    req.group = group;
    req.membershipRole = 'admin';
    return next();
  }

  // Teacher check
  if (String(group.teacher) === String(req.user._id)) {
    req.group = group;
    req.membershipRole = 'teacher';
    return next();
  }

  // Student check
  if (req.user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      group: groupId,
      student: req.user._id,
      status: { $in: ['active', 'paused'] },
    });
    if (!enrollment) return next(AppError.notFound('Group not found'));
    req.group = group;
    req.enrollment = enrollment;
    req.membershipRole = 'student';
    return next();
  }

  // Parent check (linked child is enrolled in group)
  if (req.user.role === 'parent') {
    const links = await ParentLink.find({
      parent: req.user._id,
      status: 'accepted',
    }).select('student');
    const childIds = links.map((l) => l.student);

    if (childIds.length > 0) {
      const enrollment = await Enrollment.findOne({
        group: groupId,
        student: { $in: childIds },
        status: { $in: ['active', 'paused'] },
      });
      if (enrollment) {
        req.group = group;
        req.enrollment = enrollment;
        req.membershipRole = 'parent';
        return next();
      }
    }
  }

  return next(AppError.notFound('Group not found'));
});

/**
 * Checks if user is the session's teacher or admin.
 */
export const isSessionTeacher = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.sessionId || req.params.id;
  if (!sessionId) return next(AppError.notFound('Session not found'));

  const session = await Session.findById(sessionId);
  if (!session) return next(AppError.notFound('Session not found'));

  if (req.user.role === 'admin' || String(session.teacher) === String(req.user._id)) {
    req.sessionDoc = session;
    return next();
  }

  return next(AppError.notFound('Session not found'));
});

/**
 * Verifies that the authenticated user is either the student themselves,
 * a linked and accepted parent, a teacher who teaches this student in at least one group,
 * or an admin.
 */
export const isStudentOrParentOrTeacher = asyncHandler(async (req, res, next) => {
  const studentId = req.params.studentId || req.params.id || req.body.student;
  if (!studentId) return next(AppError.notFound('Student not found'));

  if (req.user.role === 'admin' || String(studentId) === String(req.user._id)) {
    return next();
  }

  if (req.user.role === 'parent') {
    const link = await ParentLink.findOne({
      parent: req.user._id,
      student: studentId,
      status: 'accepted',
    });
    if (link) return next();
  }

  if (req.user.role === 'teacher') {
    // Check if the teacher teaches this student in any group
    const teacherGroups = await Group.find({ teacher: req.user._id, deletedAt: null }).select(
      '_id',
    );
    const groupIds = teacherGroups.map((g) => g._id);

    const enrollment = await Enrollment.findOne({
      group: { $in: groupIds },
      student: studentId,
      status: { $in: ['active', 'paused'] },
    });
    if (enrollment) return next();
  }

  return next(AppError.notFound('Student not found'));
});
