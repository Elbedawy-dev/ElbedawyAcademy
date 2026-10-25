import express from 'express';
import * as attendanceController from '../controllers/attendance.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateAttendanceSchema } from '../validators/academic.validator.js';

const router = express.Router();

router.use(protect);

router.get('/students/:studentId/report', attendanceController.getStudentAttendance);

// Teacher-managed attendance
router.get(
  '/sessions/:sessionId',
  requireApprovedTeacher,
  attendanceController.getSessionAttendance,
);

router.patch(
  '/sessions/:sessionId/students/:studentId',
  requireApprovedTeacher,
  validate(updateAttendanceSchema),
  attendanceController.manualEditAttendance,
);

router.get(
  '/groups/:groupId/report',
  requireApprovedTeacher,
  attendanceController.getGroupAttendance,
);

export default router;
