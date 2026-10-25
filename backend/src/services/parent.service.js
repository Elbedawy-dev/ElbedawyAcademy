import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import ParentProfile from '../models/ParentProfile.js';
import ParentLink from '../models/ParentLink.js';
import Group from '../models/Group.js';
import Enrollment from '../models/Enrollment.js';
import Attendance from '../models/Attendance.js';
import QuranSummary from '../models/QuranSummary.js';
import AppError from '../utils/AppError.js';
import { randomCode } from '../utils/crypto.js';
import { runInTransaction } from '../utils/transaction.js';
import { privateUser } from '../utils/serializers.js';
import { sendNotificationToUser } from './notification.service.js';

export async function getLinkedChildren(parentId) {
  const links = await ParentLink.find({ parent: parentId, status: 'accepted' })
    .populate({
      path: 'student',
      select: 'name avatar gender dateOfBirth language timezone phone',
    });

  const childrenUserIds = links.map((l) => l.student?._id).filter(Boolean);
  const profiles = await StudentProfile.find({ user: { $in: childrenUserIds } });
  const profileMap = new Map(profiles.map((p) => [String(p.user), p]));

  return links
    .filter((l) => Boolean(l.student))
    .map((l) => {
      const u = l.student;
      const sp = profileMap.get(String(u._id));
      return {
        id: String(u._id),
        name: u.name,
        avatar: u.avatar?.url || null,
        gender: u.gender,
        dateOfBirth: u.dateOfBirth,
        age: u.age,
        grade: sp?.grade || 'none',
        schoolName: sp?.schoolName || '',
        quranLevel: sp?.quranLevel || 'none',
        linkStatus: l.status,
      };
    });
}

export async function createChildAccount(parentId, childData) {
  const parent = await User.findById(parentId);
  if (!parent || parent.role !== 'parent') {
    throw AppError.forbidden('Only registered parents can create child accounts');
  }

  let createdChild;
  await runInTransaction(async (session) => {
    const childUser = new User({
      name: childData.name,
      gender: childData.gender,
      dateOfBirth: childData.dateOfBirth,
      role: 'student',
      createdByParent: parentId,
      address: parent.address,
      timezone: parent.timezone,
      language: parent.language,
      isActive: true,
      isEmailVerified: true,
    });

    const plainPassword = childData.password || randomCode(10);
    await childUser.setPassword(plainPassword);
    await childUser.save({ session });

    const studentProfile = await StudentProfile.create(
      [
        {
          user: childUser._id,
          grade: childData.grade || 'none',
          schoolName: childData.schoolName || '',
          parents: [parentId],
        },
      ],
      { session },
    );

    await ParentLink.create(
      [
        {
          parent: parentId,
          student: childUser._id,
          status: 'accepted',
          method: 'created',
          acceptedAt: new Date(),
        },
      ],
      { session },
    );

    await ParentProfile.findOneAndUpdate(
      { user: parentId },
      { $addToSet: { children: studentProfile[0]._id } },
      { session, upsert: true },
    );

    createdChild = {
      ...privateUser(childUser),
      temporaryPassword: plainPassword,
      grade: studentProfile[0].grade,
    };
  });

  return createdChild;
}

export async function linkChildByCode(parentId, code) {
  const cleanCode = String(code).trim().toUpperCase();

  const studentProfile = await StudentProfile.findOne({
    linkCode: cleanCode,
    linkCodeExpires: { $gt: new Date() },
  }).select('+linkCode +linkCodeExpires');

  if (!studentProfile) {
    throw AppError.badRequest('Invalid or expired link code', undefined, 'INVALID_LINK_CODE');
  }

  const studentId = studentProfile.user;

  // Check if link already exists
  let link = await ParentLink.findOne({ parent: parentId, student: studentId });
  if (link && link.status === 'accepted') {
    throw AppError.conflict('Student is already linked to this parent');
  }

  if (!link) {
    link = new ParentLink({
      parent: parentId,
      student: studentId,
      method: 'code',
      status: 'accepted',
      acceptedAt: new Date(),
    });
  } else {
    link.status = 'accepted';
    link.acceptedAt = new Date();
  }
  await link.save();

  // Add parent to student profile
  await StudentProfile.findByIdAndUpdate(studentProfile._id, {
    $addToSet: { parents: parentId },
    $unset: { linkCode: 1, linkCodeExpires: 1 },
  });

  // Add child to parent profile
  await ParentProfile.findOneAndUpdate(
    { user: parentId },
    { $addToSet: { children: studentProfile._id } },
    { upsert: true },
  );

  const studentUser = await User.findById(studentId);
  const parentUser = await User.findById(parentId);

  sendNotificationToUser(studentId, {
    type: 'parent_link_accepted',
    data: { parentName: parentUser.name },
  }).catch(() => {});

  return {
    success: true,
    message: `Successfully linked ${studentUser.name}`,
    student: {
      id: String(studentUser._id),
      name: studentUser.name,
      avatar: studentUser.avatar?.url || null,
    },
  };
}

export async function generateStudentLinkCode(studentId) {
  const code = randomCode(8);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await StudentProfile.findOneAndUpdate(
    { user: studentId },
    { linkCode: code, linkCodeExpires: expires },
  );

  return { code, expiresAt: expires };
}

export async function getChildDashboardSummary(parentId, studentId) {
  const link = await ParentLink.findOne({
    parent: parentId,
    student: studentId,
    status: 'accepted',
  });
  if (!link) throw AppError.notFound('Child not linked to this parent');

  const [studentUser, studentProfile, enrollments, quranSummary, attendances] = await Promise.all([
    User.findById(studentId),
    StudentProfile.findOne({ user: studentId }),
    Enrollment.find({ student: studentId, status: { $in: ['active', 'paused'] } })
      .populate({
        path: 'group',
        select: 'name subject teacher price schedule status',
        populate: [
          { path: 'subject', select: 'name type' },
          { path: 'teacher', select: 'name avatar' },
        ],
      }),
    QuranSummary.findOne({ student: studentId }),
    Attendance.find({ student: studentId }).sort({ createdAt: -1 }).limit(30),
  ]);

  if (!studentUser) throw AppError.notFound('Student not found');

  const totalSessions = attendances.length;
  const attendedCount = attendances.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;

  return {
    student: {
      id: String(studentUser._id),
      name: studentUser.name,
      avatar: studentUser.avatar?.url || null,
      grade: studentProfile?.grade,
      schoolName: studentProfile?.schoolName,
      quranLevel: studentProfile?.quranLevel,
    },
    attendanceRate,
    quranProgress: {
      totalPagesMemorized: quranSummary?.totalPagesMemorized || 0,
      percentageMemorized: quranSummary?.percentageMemorized || 0,
      juzCompleted: quranSummary?.juzCompleted || [],
    },
    activeGroups: enrollments.map((e) => ({
      enrollmentId: String(e._id),
      status: e.status,
      subscription: e.subscription,
      group: e.group,
    })),
  };
}

export default {
  getLinkedChildren,
  createChildAccount,
  linkChildByCode,
  generateStudentLinkCode,
  getChildDashboardSummary,
};
