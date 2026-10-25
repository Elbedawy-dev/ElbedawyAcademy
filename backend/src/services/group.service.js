import Group from '../models/Group.js';
import Room from '../models/Room.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import ParentLink from '../models/ParentLink.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { randomCode } from '../utils/crypto.js';
import {
  scheduleHasInternalOverlap,
  schedulesOverlap,
} from '../utils/time.js';
import { publicUser, studentForTeacher } from '../utils/serializers.js';
import { AUDIT_ACTIONS, MEMBER_ENROLLMENT_STATUSES, CURRENT_ENROLLMENT_STATUSES } from '../utils/constants.js';
import { sendNotificationToUser } from './notification.service.js';

export async function createGroup(teacherId, data) {
  const room = await Room.findOne({ teacher: teacherId, isActive: true });
  if (!room) {
    throw AppError.badRequest('Approved room required before creating groups');
  }

  // 1. Check internal schedule slot collisions
  if (scheduleHasInternalOverlap(data.schedule)) {
    throw AppError.badRequest('Weekly schedule slots overlap with each other', undefined, 'SCHEDULE_OVERLAP');
  }

  // 2. Check overlap with other active groups of this teacher
  const existingGroups = await Group.find({
    teacher: teacherId,
    deletedAt: null,
    status: { $ne: 'closed' },
  }).select('schedule name');

  for (const eg of existingGroups) {
    if (schedulesOverlap(data.schedule, eg.schedule)) {
      throw AppError.badRequest(
        `Schedule conflicts with existing group "${eg.name}"`,
        undefined,
        'TEACHER_SCHEDULE_CONFLICT',
      );
    }
  }

  const joinCode = randomCode(8);

  const group = await Group.create({
    ...data,
    room: room._id,
    teacher: teacherId,
    joinCode,
    activeMembersCount: 0,
  });

  return group;
}

export async function updateGroup(groupId, teacherId, updates, actorMeta = {}) {
  const group = await Group.findOne({ _id: groupId, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  // Check schedule validity if being updated
  if (updates.schedule) {
    if (scheduleHasInternalOverlap(updates.schedule)) {
      throw AppError.badRequest('Weekly schedule slots overlap with each other', undefined, 'SCHEDULE_OVERLAP');
    }

    const otherGroups = await Group.find({
      teacher: teacherId,
      _id: { $ne: groupId },
      deletedAt: null,
      status: { $ne: 'closed' },
    }).select('schedule name');

    for (const og of otherGroups) {
      if (schedulesOverlap(updates.schedule, og.schedule)) {
        throw AppError.badRequest(
          `Schedule conflicts with existing group "${og.name}"`,
          undefined,
          'TEACHER_SCHEDULE_CONFLICT',
        );
      }
    }
    group.schedule = updates.schedule;
  }

  if (updates.price) {
    const oldPrice = group.price?.amount;
    const newPrice = updates.price.amount;
    if (oldPrice !== newPrice) {
      await AuditLog.create({
        actor: teacherId,
        action: AUDIT_ACTIONS.GROUP_PRICE_CHANGED,
        entity: 'Group',
        entityId: group._id,
        meta: { oldPrice, newPrice, currency: updates.price.currency },
        ip: actorMeta.ip,
        userAgent: actorMeta.userAgent,
      });
    }
    group.price = updates.price;
  }

  if (updates.name !== undefined) group.name = updates.name;
  if (updates.gradeLevel !== undefined) group.gradeLevel = updates.gradeLevel;
  if (updates.genderType !== undefined) group.genderType = updates.genderType;
  if (updates.maxStudents !== undefined) {
    group.maxStudents = updates.maxStudents;
    if (group.activeMembersCount >= group.maxStudents && group.status === 'open') {
      group.status = 'full';
    }
  }
  if (updates.joinMode !== undefined) group.joinMode = updates.joinMode;
  if (updates.status !== undefined) group.status = updates.status;

  await group.save();
  return group;
}

export async function regenerateJoinCode(groupId, teacherId) {
  const group = await Group.findOne({ _id: groupId, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  group.joinCode = randomCode(8);
  await group.save();

  return { joinCode: group.joinCode };
}

export async function listMyGroups(currentUser, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let filter = { deletedAt: null };

  if (currentUser.role === 'admin') {
    if (query.teacherId) filter.teacher = query.teacherId;
    if (query.subjectId) filter.subject = query.subjectId;
  } else if (currentUser.role === 'teacher') {
    filter.teacher = currentUser._id;
  } else if (currentUser.role === 'student') {
    // Student sees ONLY groups they belong to
    const enrollments = await Enrollment.find({
      student: currentUser._id,
      status: { $in: MEMBER_ENROLLMENT_STATUSES },
    }).select('group');
    const groupIds = enrollments.map((e) => e.group);
    filter._id = { $in: groupIds };
  } else if (currentUser.role === 'parent') {
    // Parent sees only groups where their linked children are enrolled
    const links = await ParentLink.find({ parent: currentUser._id, status: 'accepted' }).select('student');
    const childIds = links.map((l) => l.student);

    const enrollments = await Enrollment.find({
      student: { $in: childIds },
      status: { $in: MEMBER_ENROLLMENT_STATUSES },
    }).select('group');
    const groupIds = enrollments.map((e) => e.group);
    filter._id = { $in: groupIds };
  }

  if (query.status) filter.status = query.status;

  const [groups, total] = await Promise.all([
    Group.find(filter)
      .populate('subject', 'name type')
      .populate('teacher', 'name avatar gender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Group.countDocuments(filter),
  ]);

  return {
    data: groups,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getGroupById(groupId, currentUser) {
  const group = await Group.findOne({ _id: groupId, deletedAt: null })
    .populate('subject', 'name type')
    .populate('teacher', 'name avatar gender');

  if (!group) throw AppError.notFound('Group not found');

  // Privacy isolation check
  if (currentUser.role === 'admin' || String(group.teacher._id) === String(currentUser._id)) {
    return group;
  }

  if (currentUser.role === 'student') {
    const isMember = await Enrollment.exists({
      group: groupId,
      student: currentUser._id,
      status: { $in: MEMBER_ENROLLMENT_STATUSES },
    });
    if (!isMember) throw AppError.notFound('Group not found');
    return group;
  }

  if (currentUser.role === 'parent') {
    const links = await ParentLink.find({ parent: currentUser._id, status: 'accepted' }).select('student');
    const childIds = links.map((l) => l.student);
    const hasEnrolledChild = await Enrollment.exists({
      group: groupId,
      student: { $in: childIds },
      status: { $in: MEMBER_ENROLLMENT_STATUSES },
    });
    if (!hasEnrolledChild) throw AppError.notFound('Group not found');
    return group;
  }

  throw AppError.notFound('Group not found');
}

export async function listGroupMembers(groupId, currentUser, requestedStatus) {
  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  const isTeacherOrAdmin =
    currentUser.role === 'admin' || String(group.teacher) === String(currentUser._id);

  if (!isTeacherOrAdmin) {
    if (currentUser.role === 'student') {
      const isMember = await Enrollment.exists({
        group: groupId,
        student: currentUser._id,
        status: { $in: MEMBER_ENROLLMENT_STATUSES },
      });
      if (!isMember) throw AppError.notFound('Group not found');
    } else if (currentUser.role === 'parent') {
      const links = await ParentLink.find({ parent: currentUser._id, status: 'accepted' }).select('student');
      const childIds = links.map((l) => l.student);
      const hasChild = await Enrollment.exists({
        group: groupId,
        student: { $in: childIds },
        status: { $in: MEMBER_ENROLLMENT_STATUSES },
      });
      if (!hasChild) throw AppError.notFound('Group not found');
    } else {
      throw AppError.notFound('Group not found');
    }
  }

  let statusFilter = { $in: MEMBER_ENROLLMENT_STATUSES };
  if (requestedStatus) {
    if (!isTeacherOrAdmin) {
      throw AppError.forbidden('Only group teacher or admin can filter members by status');
    }
    const allowed = CURRENT_ENROLLMENT_STATUSES;
    if (!allowed.includes(requestedStatus)) {
      throw AppError.badRequest(`Invalid status filter. Allowed: ${allowed.join(', ')}`);
    }
    statusFilter = requestedStatus;
  }

  const enrollments = await Enrollment.find({
    group: groupId,
    status: statusFilter,
  }).populate('student');

  return enrollments.map((enr) => {
    const studentUser = enr.student;
    if (!studentUser) return null;

    if (isTeacherOrAdmin) {
      return {
        enrollmentId: String(enr._id),
        status: enr.status,
        joinedAt: enr.joinedAt,
        subscription: enr.subscription,
        student: studentForTeacher(studentUser),
      };
    }

    // Peers in group see ONLY basic public identifiers (never addresses, DOB, or contacts)
    return {
      enrollmentId: String(enr._id),
      status: enr.status,
      joinedAt: enr.joinedAt,
      student: publicUser(studentUser),
    };
  }).filter(Boolean);
}

export async function removeMember(groupId, studentId, teacherId, reason, actorMeta = {}) {
  const group = await Group.findOne({ _id: groupId, teacher: teacherId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  const enrollment = await Enrollment.findOne({
    group: groupId,
    student: studentId,
    status: { $in: CURRENT_ENROLLMENT_STATUSES },
  });
  if (!enrollment) throw AppError.notFound('Enrollment not found');

  const wasActive = enrollment.status === 'active';
  enrollment.status = 'cancelled';
  enrollment.cancelledAt = new Date();
  enrollment.cancellationReason = reason || 'Removed by teacher';
  await enrollment.save();

  if (wasActive && group.activeMembersCount > 0) {
    group.activeMembersCount -= 1;
    if (group.status === 'full' && group.activeMembersCount < group.maxStudents) {
      group.status = 'open';
    }
    await group.save();
  }

  await AuditLog.create({
    actor: teacherId,
    action: AUDIT_ACTIONS.MEMBER_REMOVED,
    entity: 'Enrollment',
    entityId: enrollment._id,
    meta: { groupId, studentId, reason },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  sendNotificationToUser(studentId, {
    type: 'enrollment_removed',
    data: { groupName: group.name },
  }).catch(() => {});

  return { success: true, message: 'Member removed from group' };
}

export async function moveMember(sourceGroupId, targetGroupId, studentId, teacherId, actorMeta = {}) {
  const [sourceGroup, targetGroup] = await Promise.all([
    Group.findOne({ _id: sourceGroupId, teacher: teacherId, deletedAt: null }),
    Group.findOne({ _id: targetGroupId, teacher: teacherId, deletedAt: null }),
  ]);

  if (!sourceGroup || !targetGroup) throw AppError.notFound('One or both groups not found');

  if (targetGroup.activeMembersCount >= targetGroup.maxStudents) {
    throw AppError.badRequest('Target group is already full', undefined, 'GROUP_FULL');
  }

  const enrollment = await Enrollment.findOne({
    group: sourceGroupId,
    student: studentId,
    status: { $in: MEMBER_ENROLLMENT_STATUSES },
  });
  if (!enrollment) throw AppError.notFound('Active enrollment not found in source group');

  enrollment.group = targetGroupId;
  await enrollment.save();

  // Update member counters
  if (sourceGroup.activeMembersCount > 0) {
    sourceGroup.activeMembersCount -= 1;
    if (sourceGroup.status === 'full' && sourceGroup.activeMembersCount < sourceGroup.maxStudents) {
      sourceGroup.status = 'open';
    }
    await sourceGroup.save();
  }

  targetGroup.activeMembersCount += 1;
  if (targetGroup.activeMembersCount >= targetGroup.maxStudents) {
    targetGroup.status = 'full';
  }
  await targetGroup.save();

  await AuditLog.create({
    actor: teacherId,
    action: AUDIT_ACTIONS.MEMBER_MOVED,
    entity: 'Enrollment',
    entityId: enrollment._id,
    meta: { sourceGroupId, targetGroupId, studentId },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  return { success: true, message: 'Student moved successfully' };
}

export default {
  createGroup,
  updateGroup,
  regenerateJoinCode,
  listMyGroups,
  getGroupById,
  listGroupMembers,
  removeMember,
  moveMember,
};
