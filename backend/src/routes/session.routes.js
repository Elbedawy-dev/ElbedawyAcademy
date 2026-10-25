import express from 'express';
import * as sessionController from '../controllers/session.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createSessionSchema,
  updateSessionSchema,
  calendarQuerySchema,
  generateRecurringSessionsSchema,
} from '../validators/session.validator.js';

const router = express.Router();

router.use(protect);

// Calendar search across accessible sessions
router.get('/calendar', validate(calendarQuerySchema), sessionController.getCalendarSessions);

// Teacher-managed session creation & lifecycle
router.post(
  '/',
  requireApprovedTeacher,
  validate(createSessionSchema),
  sessionController.createSession,
);

router.post(
  '/recurring',
  requireApprovedTeacher,
  validate(generateRecurringSessionsSchema),
  sessionController.generateRecurringSessions,
);

router.patch(
  '/:id',
  requireApprovedTeacher,
  validate(updateSessionSchema),
  sessionController.updateSession,
);

router.post(
  '/:id/cancel',
  requireApprovedTeacher,
  sessionController.cancelSession,
);

export default router;
