import express from 'express';
import * as progressController from '../controllers/progress.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createQuranProgressSchema,
  updateQuranProgressSchema,
  createSchoolProgressSchema,
} from '../validators/progress.validator.js';

const router = express.Router();

router.use(protect);

// Student/parent/teacher/admin views
router.get('/quran/student/:studentId', progressController.getStudentQuranTimeline);
router.get('/quran/student/:studentId/needs-review', progressController.getNeedsReviewSuggestions);
router.get('/school/student/:studentId', progressController.getStudentSchoolProgress);
router.get('/student/:studentId/pdf', progressController.exportProgressPdf);

// Teacher modifications
router.post(
  '/quran',
  requireApprovedTeacher,
  validate(createQuranProgressSchema),
  progressController.addQuranEntry,
);

router.patch(
  '/quran/:id',
  requireApprovedTeacher,
  validate(updateQuranProgressSchema),
  progressController.updateQuranEntry,
);

router.delete(
  '/quran/:id',
  requireApprovedTeacher,
  progressController.deleteQuranEntry,
);

router.post(
  '/school',
  requireApprovedTeacher,
  validate(createSchoolProgressSchema),
  progressController.recordSchoolProgress,
);

export default router;
