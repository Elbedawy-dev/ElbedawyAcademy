import express from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import teacherRoutes from './teacher.routes.js';
import parentRoutes from './parent.routes.js';
import roomRoutes from './room.routes.js';
import groupRoutes from './group.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import sessionRoutes from './session.routes.js';
import liveRoutes from './live.routes.js';
import attendanceRoutes from './attendance.routes.js';
import progressRoutes from './progress.routes.js';
import assignmentRoutes from './assignment.routes.js';
import chatRoutes from './chat.routes.js';
import notificationRoutes from './notification.routes.js';
import paymentRoutes from './payment.routes.js';
import payoutRoutes from './payout.routes.js';
import certificateRoutes from './certificate.routes.js';
import reviewRoutes from './review.routes.js';
import reportRoutes from './report.routes.js';
import settingsRoutes from './settings.routes.js';
import subjectRoutes from './subject.routes.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(200).json({
    success: true,
    message: 'Elbedawy Academy API is healthy',
    data: {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatusMap[dbState] || 'unknown',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/rooms', roomRoutes);
router.use('/groups', groupRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/sessions', sessionRoutes);
router.use('/live', liveRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/progress', progressRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/payouts', payoutRoutes);
router.use('/certificates', certificateRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/subjects', subjectRoutes);

export default router;
