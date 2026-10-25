import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as reviewService from '../services/review.service.js';

export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user, req.body);
  sendCreated(res, { message: 'Review submitted successfully', data: review });
});

export const moderateReview = asyncHandler(async (req, res) => {
  const review = await reviewService.moderateReview(
    req.params.id,
    req.body.status,
    req.user,
  );
  sendSuccess(res, { message: `Review marked as ${req.body.status}`, data: review });
});

export const getTeacherReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getTeacherReviews(req.params.teacherId, req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export default {
  createReview,
  moderateReview,
  getTeacherReviews,
};
