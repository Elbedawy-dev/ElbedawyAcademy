import express from 'express';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  requestEnrollmentSchema,
  joinByCodeSchema,
  parentEnrollSchema,
  updateEnrollmentStatusSchema,
} from '../validators/enrollment.validator.js';

const router = express.Router();

router.use(protect);

router.post(
  '/request',
  restrictTo('student'),
  validate(requestEnrollmentSchema),
  enrollmentController.requestJoinGroup,
);

router.post(
  '/join-by-code',
  restrictTo('student'),
  validate(joinByCodeSchema),
  enrollmentController.joinByCode,
);

router.post(
  '/parent-enroll',
  restrictTo('parent', 'admin'),
  validate(parentEnrollSchema),
  enrollmentController.parentEnrollChild,
);

router.patch(
  '/:id/status',
  restrictTo('teacher', 'admin'),
  validate(updateEnrollmentStatusSchema),
  enrollmentController.updateEnrollmentStatus,
);

export default router;
