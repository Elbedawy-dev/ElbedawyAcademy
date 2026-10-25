import express from 'express';
import * as liveController from '../controllers/live.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireApprovedTeacher } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(protect);

// Join token for active student or teacher
router.get('/sessions/:sessionId/token', liveController.getLiveJoinToken);

// Teacher controls
router.post(
  '/sessions/:sessionId/start',
  requireApprovedTeacher,
  liveController.startLiveSession,
);

router.post(
  '/sessions/:sessionId/end',
  requireApprovedTeacher,
  liveController.endLiveSession,
);

router.post(
  '/sessions/:sessionId/kick/:studentId',
  requireApprovedTeacher,
  liveController.kickParticipant,
);

router.post(
  '/sessions/:sessionId/mute/:studentId',
  requireApprovedTeacher,
  liveController.muteParticipant,
);

export default router;
