import User from '../models/User.js';
import TeacherProfile from '../models/TeacherProfile.js';
import Group from '../models/Group.js';
import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Report from '../models/Report.js';

export async function getAdminAnalytics() {
  const [
    totalStudents,
    totalTeachers,
    totalParents,
    totalGroups,
    activeLiveSessions,
    pendingTeachersCount,
    openReportsCount,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true, deletedAt: null }),
    TeacherProfile.countDocuments({ status: 'approved' }),
    User.countDocuments({ role: 'parent', isActive: true, deletedAt: null }),
    Group.countDocuments({ status: 'open', deletedAt: null }),
    Session.countDocuments({ status: 'live' }),
    TeacherProfile.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'open' }),
  ]);

  // Financial metrics
  const financialSummary = await Payment.aggregate([
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalPlatformFees: { $sum: '$platformFee' },
        totalTeacherPayouts: { $sum: '$teacherAmount' },
        successfulPaymentsCount: { $sum: 1 },
      },
    },
  ]);

  const financials = financialSummary[0] || {
    totalRevenue: 0,
    totalPlatformFees: 0,
    totalTeacherPayouts: 0,
    successfulPaymentsCount: 0,
  };

  // Top teachers by rating & students
  const topTeachers = await TeacherProfile.find({ status: 'approved' })
    .populate('user', 'name avatar')
    .sort({ ratingAvg: -1, ratingCount: -1 })
    .limit(5);

  // Overall attendance rate
  const attendanceAgg = await Attendance.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
      },
    },
  ]);

  const att = attendanceAgg[0] || { total: 0, present: 0 };
  const overallAttendanceRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;

  // 6 months user growth
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const growthAgg = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, deletedAt: null } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          role: '$role',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return {
    overview: {
      totalStudents,
      totalTeachers,
      totalParents,
      totalGroups,
      activeLiveSessions,
      pendingTeachersCount,
      openReportsCount,
      overallAttendanceRate,
    },
    financials,
    topTeachers: topTeachers.map((t) => ({
      id: String(t.user?._id),
      name: t.user?.name,
      avatar: t.user?.avatar?.url,
      ratingAvg: t.ratingAvg,
      ratingCount: t.ratingCount,
      yearsOfExperience: t.yearsOfExperience,
    })),
    growth: growthAgg,
  };
}

export default {
  getAdminAnalytics,
};
