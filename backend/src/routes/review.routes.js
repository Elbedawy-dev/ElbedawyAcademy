import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createReviewSchema } from '../validators/academic.validator.js';

const router = express.Router();

router.get('/teachers/:teacherId', reviewController.getTeacherReviews);

// Protected routes
router.use(protect);
router.post('/', validate(createReviewSchema), reviewController.createReview);
router.patch('/:id/moderate', restrictTo('admin'), reviewController.moderateReview);

export default router;
