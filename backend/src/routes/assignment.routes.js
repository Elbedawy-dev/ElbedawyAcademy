import express from 'express';
import * as assignmentController from '../controllers/assignment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadAssignmentFiles } from '../middlewares/upload.middleware.js';
import {
  createAssignmentSchema,
  gradeSubmissionSchema,
} from '../validators/academic.validator.js';

const router = express.Router();

router.use(protect);

router.get('/groups/:groupId', assignmentController.listGroupAssignments);

// Teacher creates assignment
router.post(
  '/',
  requireApprovedTeacher,
  uploadAssignmentFiles,
  validate(createAssignmentSchema),
  assignmentController.createAssignment,
);

// Student submits assignment
router.post(
  '/:id/submit',
  uploadAssignmentFiles,
  assignmentController.submitAssignment,
);

// Teacher lists & grades submissions
router.get(
  '/:id/submissions',
  requireApprovedTeacher,
  assignmentController.getSubmissionsForAssignment,
);

router.patch(
  '/submissions/:id/grade',
  requireApprovedTeacher,
  validate(gradeSubmissionSchema),
  assignmentController.gradeSubmission,
);

export default router;
