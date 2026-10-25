import Enrollment from '../models/Enrollment.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import ParentLink from '../models/ParentLink.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/AppError.js';
import { CURRENT_ENROLLMENT_STATUSES, MEMBER_ENROLLMENT_STATUSES, HELD_ENROLLMENT_STATUSES } from '../utils/constants.js';
import { sendNotificationToUser } from './notification.service.js';

function schedulesOverlap(scheduleA = [], scheduleB = []) {
  for (const sA of scheduleA) {
    for (const sB of scheduleB) {
      if (sA.dayOfWeek === sB.dayOfWeek) {
        if (sA.startTime < sB.endTime && sB.startTime < sA.endTime) {
          return true;
        }
      }
    }
  }
  return false;
}

async function validateEnrollmentEligibility(studentUser, group) {
  const settings = await Settings.getSettings();

  // 1. Check age restriction against group level
  if (studentUser.dateOfBirth) {
    const age = Math.floor(
      (new Date() - new Date(studentUser.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000),
    );
    if (['primary_1', 'primary_2', 'primary_3'].includes(group.gradeLevel) && age > 11) {
      throw AppError.badRequest('Student age exceeds maximum limit for this grade level');
    }
  }

  // 2. Gender segregation
  if (group.genderType === 'boys' && studentUser.gender !== 'male') {
    throw AppError.badRequest('This group is designated for male students only');
  }
  if (group.genderType === 'girls' && studentUser.gender !== 'female') {
    throw AppError.badRequest('This group is designated for female students only');
  }

  // 3. Strict female student -> female teacher setting
  if (settings.enforceGenderMatch && studentUser.gender === 'female') {
    const teacherUser = await User.findById(group.teacher);
    if (teacherUser && teacherUser.gender !== 'female') {
      throw AppError.badRequest('Academy rules require female students to be enrolled with female teachers');
    }
  }

  // 4. Overlap with existing enrollments for the same subject (active, paused, or awaiting_payment)
  const currentEnrollments = await Enrollment.find({
    student: studentUser._id,
    status: { $in: HELD_ENROLLMENT_STATUSES },
  }).populate({
    path: 'group',
    select: 'subject schedule name',
  });

  for (const enr of currentEnrollments) {
    if (!enr.group) continue;
    if (String(enr.group.subject) === String(group.subject)) {
      if (schedulesOverlap(group.schedule, enr.group.schedule)) {
        throw AppError.badRequest(
          `Schedule overlaps with your existing enrollment in "${enr.group.name}"`,
          undefined,
          'SCHEDULE_OVERLAP',
        );
      }
    }
  }

  // 5. Max students check
  if (group.activeMembersCount >= group.maxStudents || group.status === 'full') {
    throw AppError.badRequest('Group has reached maximum student capacity', undefined, 'GROUP_FULL');
  }
}

export async function requestJoinGroup(groupId, studentId) {
  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group || group.status === 'closed') {
    throw AppError.notFound('Group not found or closed');
  }

  const isPaid = (group.price?.amount ?? 0) > 0;

  // Honor joinMode: invite_only groups cannot be joined via open request
  if (group.joinMode === 'invite_only') {
    throw AppError.badRequest('This group is invite-only. Please use a group join code.', undefined, 'INVITE_ONLY_GROUP');
  }

  const studentUser = await User.findById(studentId);
  if (!studentUser) throw AppError.notFound('Student not found');

  const existing = await Enrollment.findOne({ group: groupId, student: studentId });
  if (existing) {
    if (HELD_ENROLLMENT_STATUSES.includes(existing.status)) {
      if (existing.status === 'awaiting_payment' && isPaid) {
        return {
          requiresPayment: true,
          groupId: String(group._id),
          studentId: String(studentId),
          status: 'awaiting_payment',
          enrollment: existing,
        };
      }
      throw AppError.conflict('Student is already enrolled or awaiting payment in this group');
    }
    if (existing.status === 'pending') {
      throw AppError.conflict('Enrollment request is already pending approval');
    }
  }

  await validateEnrollmentEligibility(studentUser, group);

  // Paid group logic
  if (isPaid) {
    if (group.joinMode === 'open') {
      let enrollment = existing;
      if (enrollment) {
        enrollment.status = 'awaiting_payment';
        await enrollment.save();
      } else {
        enrollment = await Enrollment.create({
          group: groupId,
          student: studentId,
          status: 'awaiting_payment',
        });
      }
      return {
        requiresPayment: true,
        groupId: String(group._id),
        studentId: String(studentId),
        status: 'awaiting_payment',
        enrollment,
      };
    } else {
      // joinMode === 'request'
      let enrollment = existing;
      if (enrollment) {
        enrollment.status = 'pending';
        await enrollment.save();
      } else {
        enrollment = await Enrollment.create({
          group: groupId,
          student: studentId,
          status: 'pending',
        });
      }

      sendNotificationToUser(group.teacher, {
        type: 'enrollment_request',
        data: {
          studentName: studentUser.name,
          groupId: String(group._id),
        },
      }).catch(() => {});

      return {
        requiresPayment: false,
        groupId: String(group._id),
        studentId: String(studentId),
        status: 'pending',
        enrollment,
      };
    }
  }

  // Free group (price.amount === 0)
  const isDirect = group.joinMode === 'open';
  const enrollmentStatus = isDirect ? 'active' : 'pending';

  let enrollment = existing;
  if (enrollment) {
    enrollment.status = enrollmentStatus;
    enrollment.joinedAt = isDirect ? new Date() : undefined;
    await enrollment.save();
  } else {
    enrollment = await Enrollment.create({
      group: groupId,
      student: studentId,
      status: enrollmentStatus,
      joinedAt: isDirect ? new Date() : undefined,
    });
  }

  if (isDirect) {
    group.activeMembersCount += 1;
    if (group.activeMembersCount >= group.maxStudents) group.status = 'full';
    await group.save();
  } else {
    sendNotificationToUser(group.teacher, {
      type: 'enrollment_request',
      data: {
        studentName: studentUser.name,
        groupId: String(group._id),
      },
    }).catch(() => {});
  }

  return enrollment;
}

export async function joinByCode(code, studentId) {
  const cleanCode = String(code).trim().toUpperCase();
  const group = await Group.findOne({ joinCode: cleanCode, deletedAt: null });
  if (!group || group.status === 'closed') {
    throw AppError.badRequest('Invalid or closed group join code', undefined, 'INVALID_JOIN_CODE');
  }

  const studentUser = await User.findById(studentId);
  if (!studentUser) throw AppError.notFound('Student not found');

  const existing = await Enrollment.findOne({ group: group._id, student: studentId });
  if (existing && HELD_ENROLLMENT_STATUSES.includes(existing.status)) {
    if (existing.status === 'awaiting_payment' && (group.price?.amount ?? 0) > 0) {
      return {
        requiresPayment: true,
        groupId: String(group._id),
        studentId: String(studentId),
        status: 'awaiting_payment',
        enrollment: existing,
      };
    }
    throw AppError.conflict('Already enrolled in this group');
  }

  await validateEnrollmentEligibility(studentUser, group);

  const isPaid = (group.price?.amount ?? 0) > 0;

  if (isPaid) {
    let enrollment = existing;
    if (enrollment) {
      enrollment.status = 'awaiting_payment';
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        group: group._id,
        student: studentId,
        status: 'awaiting_payment',
      });
    }
    return {
      requiresPayment: true,
      groupId: String(group._id),
      studentId: String(studentId),
      status: 'awaiting_payment',
      enrollment,
    };
  }

  // Free group
  let enrollment = existing;
  if (enrollment) {
    enrollment.status = 'active';
    enrollment.joinedAt = new Date();
    await enrollment.save();
  } else {
    enrollment = await Enrollment.create({
      group: group._id,
      student: studentId,
      status: 'active',
      joinedAt: new Date(),
    });
  }

  group.activeMembersCount += 1;
  if (group.activeMembersCount >= group.maxStudents) group.status = 'full';
  await group.save();

  sendNotificationToUser(studentId, {
    type: 'enrollment_accepted',
    data: { groupName: group.name },
  }).catch(() => {});

  return enrollment;
}

export async function parentEnrollChild(parentId, groupId, studentId, code) {
  const isLinked = await ParentLink.exists({
    parent: parentId,
    student: studentId,
    status: 'accepted',
  });
  if (!isLinked) {
    throw AppError.badRequest('Student is not linked to your parent account');
  }

  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group || group.status === 'closed') throw AppError.notFound('Group not found');

  const studentUser = await User.findById(studentId);
  if (!studentUser) throw AppError.notFound('Student not found');
  await validateEnrollmentEligibility(studentUser, group);

  let enrollment = await Enrollment.findOne({ group: groupId, student: studentId });
  if (enrollment) {
    if (HELD_ENROLLMENT_STATUSES.includes(enrollment.status)) {
      if (enrollment.status === 'awaiting_payment' && (group.price?.amount ?? 0) > 0) {
        return {
          requiresPayment: true,
          groupId: String(groupId),
          studentId: String(studentId),
          status: 'awaiting_payment',
          enrollment,
        };
      }
      throw AppError.conflict('Child is already enrolled in this group');
    }
    if (enrollment.status === 'pending') {
      throw AppError.conflict('Enrollment request is already pending approval');
    }
  }

  const isPaid = (group.price?.amount ?? 0) > 0;
  const cleanCode = code ? String(code).trim().toUpperCase() : '';
  const hasValidCode = Boolean(cleanCode && cleanCode === group.joinCode);

  // 1. invite_only requires a valid code
  if (group.joinMode === 'invite_only') {
    if (!hasValidCode) {
      throw AppError.badRequest('Invalid or required join code for invite-only group', undefined, 'INVALID_JOIN_CODE');
    }
  }

  // 2. request requires teacher approval UNLESS a valid join code is supplied
  if (group.joinMode === 'request' && !hasValidCode) {
    if (cleanCode && !hasValidCode) {
      throw AppError.badRequest('Invalid join code', undefined, 'INVALID_JOIN_CODE');
    }

    if (!enrollment) {
      enrollment = await Enrollment.create({
        group: groupId,
        student: studentId,
        enrolledByParent: parentId,
        status: 'pending',
      });
    } else {
      enrollment.enrolledByParent = parentId;
      enrollment.status = 'pending';
      await enrollment.save();
    }

    sendNotificationToUser(group.teacher, {
      type: 'enrollment_request',
      data: {
        studentName: studentUser.name,
        groupId: String(group._id),
      },
    }).catch(() => {});

    return enrollment;
  }

  // 3. open (or request/invite_only with valid invitation code)
  if (isPaid) {
    if (!enrollment) {
      enrollment = await Enrollment.create({
        group: groupId,
        student: studentId,
        enrolledByParent: parentId,
        status: 'awaiting_payment',
      });
    } else {
      enrollment.enrolledByParent = parentId;
      enrollment.status = 'awaiting_payment';
      await enrollment.save();
    }
    return {
      requiresPayment: true,
      groupId: String(groupId),
      studentId: String(studentId),
      status: 'awaiting_payment',
      enrollment,
    };
  }

  // Free group
  if (enrollment) {
    enrollment.status = 'active';
    enrollment.enrolledByParent = parentId;
    enrollment.joinedAt = new Date();
    await enrollment.save();
  } else {
    enrollment = await Enrollment.create({
      group: groupId,
      student: studentId,
      enrolledByParent: parentId,
      status: 'active',
      joinedAt: new Date(),
    });
  }

  group.activeMembersCount += 1;
  if (group.activeMembersCount >= group.maxStudents) group.status = 'full';
  await group.save();

  return enrollment;
}

export async function updateEnrollmentStatus(enrollmentId, action, reason, currentUser) {
  const enrollment = await Enrollment.findById(enrollmentId).populate('group');
  if (!enrollment) throw AppError.notFound('Enrollment not found');

  const group = enrollment.group;
  const isTeacher = String(group.teacher) === String(currentUser._id);
  const isAdmin = currentUser.role === 'admin';

  if (!isTeacher && !isAdmin) {
    throw AppError.forbidden('Only group teacher or admin can modify enrollment status');
  }

  const prevStatus = enrollment.status;

  // Status guards: accept and reject are allowed only when the enrollment is pending; otherwise 409 ENROLLMENT_INVALID_STATE
  if (action === 'accept' || action === 'reject') {
    if (prevStatus !== 'pending') {
      throw AppError.conflict(
        `Cannot ${action} enrollment with status '${prevStatus}'`,
        undefined,
        'ENROLLMENT_INVALID_STATE',
      );
    }
  }

  if (action === 'accept') {
    if (group.activeMembersCount >= group.maxStudents) {
      throw AppError.badRequest('Group is full', undefined, 'GROUP_FULL');
    }

    const isPaid = (group.price?.amount ?? 0) > 0;

    if (isPaid) {
      enrollment.status = 'awaiting_payment';
      await enrollment.save();

      sendNotificationToUser(enrollment.student, {
        type: 'enrollment_accepted',
        title: { ar: 'تمت الموافقة على طلب الانضمام', en: 'Join Request Approved' },
        body: {
          ar: `تمت الموافقة على طلبك للانضمام إلى مجموعة "${group.name}". يرجى إتمام الدفع لتفعيل اشتراكك.`,
          en: `Your join request for "${group.name}" was approved. Please complete payment.`,
        },
        data: {
          groupId: String(group._id),
          groupName: group.name,
          requiresPayment: true,
        },
      }).catch(() => {});

      return {
        requiresPayment: true,
        groupId: String(group._id),
        studentId: String(enrollment.student),
        status: 'awaiting_payment',
        enrollment,
      };
    }

    enrollment.status = 'active';
    enrollment.joinedAt = new Date();
    group.activeMembersCount += 1;
    if (group.activeMembersCount >= group.maxStudents) group.status = 'full';
    await group.save();

    sendNotificationToUser(enrollment.student, {
      type: 'enrollment_accepted',
      data: { groupName: group.name },
    }).catch(() => {});
  } else if (action === 'reject') {
    enrollment.status = 'cancelled';
    enrollment.cancellationReason = reason;

    sendNotificationToUser(enrollment.student, {
      type: 'enrollment_rejected',
      data: { groupName: group.name, reason },
    }).catch(() => {});
  } else if (action === 'pause') {
    enrollment.status = 'paused';
    enrollment.pausedAt = new Date();
  } else if (action === 'resume') {
    enrollment.status = 'active';
  } else if (action === 'cancel') {
    enrollment.status = 'cancelled';
    enrollment.cancelledAt = new Date();
    enrollment.cancellationReason = reason;

    if (prevStatus === 'active' && group.activeMembersCount > 0) {
      group.activeMembersCount -= 1;
      if (group.status === 'full' && group.activeMembersCount < group.maxStudents) {
        group.status = 'open';
      }
      await group.save();
    }
  }

  await enrollment.save();
  return enrollment;
}

export default {
  requestJoinGroup,
  joinByCode,
  parentEnrollChild,
  updateEnrollmentStatus,
};
