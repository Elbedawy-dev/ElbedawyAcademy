import express from 'express';
import * as payoutController from '../controllers/payout.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updatePayoutStatusSchema } from '../validators/payment.validator.js';

const router = express.Router();

router.use(protect);

router.get(
  '/teacher/dashboard',
  restrictTo('teacher'),
  payoutController.getTeacherEarningsDashboard,
);

// Admin payout management
router.use(restrictTo('admin'));
router.get('/all', payoutController.listAllPayouts);
router.post('/calculate', payoutController.triggerCalculatePayouts);
router.patch(
  '/:id/status',
  validate(updatePayoutStatusSchema),
  payoutController.updatePayoutStatus,
);

export default router;
