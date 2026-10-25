import Review from '../models/Review.js';
import TeacherProfile from '../models/TeacherProfile.js';
import Group from '../models/Group.js';
import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import ParentLink from '../models/ParentLink.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export async function createReview(reviewerUser, { groupId, rating, comment }) {
  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group) throw AppError.notFound('Group not found');

  let targetStudentId = reviewerUser._id;

  if (reviewerUser.role === 'parent') {
    const link = await ParentLink.findOne({ parent: reviewerUser._id, status: 'accepted' });
    if (!link) throw AppError.badRequest('No linked child found for parent review');
    targetStudentId = link.student;
  }

  // Check attendance requirement
  const settings = await Settings.getSettings();
  const minSessions = settings.minSessionsBeforeReview || 2;

  const attendedSessionsCount = await Attendance.countDocuments({
    student: targetStudentId,
    status: { $in: ['present', 'late'] },
  });

  if (attendedSessionsCount < minSessions) {
    throw AppError.badRequest(
      `You must attend at least ${minSessions} sessions before rating this teacher`,
      undefined,
      'INSUFFICIENT_ATTENDANCE',
    );
  }

  const existingReview = await Review.findOne({
    reviewer: reviewerUser._id,
    group: groupId,
  });

  if (existingReview) {
    throw AppError.conflict('You have already submitted a review for this group');
  }

  const review = await Review.create({
    student: targetStudentId,
    reviewer: reviewerUser._id,
    teacher: group.teacher,
    group: groupId,
    rating,
    comment,
    status: 'visible',
  });

  await recalculateTeacherRating(group.teacher);
  return review;
}

export async function recalculateTeacherRating(teacherId) {
  const reviews = await Review.find({ teacher: teacherId, status: 'visible' });
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / count : 0;

  await TeacherProfile.findOneAndUpdate(
    { user: teacherId },
    {
      ratingAvg: Math.round(avg * 10) / 10,
      ratingCount: count,
    },
  );
}

export async function moderateReview(reviewId, status, adminUser) {
  const review = await Review.findById(reviewId);
  if (!review) throw AppError.notFound('Review not found');

  review.status = status;
  review.moderatedBy = adminUser._id;
  review.moderatedAt = new Date();
  await review.save();

  await recalculateTeacherRating(review.teacher);

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.REVIEW_MODERATED,
    entity: 'Review',
    entityId: review._id,
    meta: { status },
  });

  return review;
}

export async function getTeacherReviews(teacherId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { teacher: teacherId, status: 'visible' };

  const [data, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default {
  createReview,
  moderateReview,
  getTeacherReviews,
  recalculateTeacherRating,
};
