import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createCheckoutSchema,
  refundPaymentSchema,
} from '../validators/payment.validator.js';

const router = express.Router();

// Webhook from Paymob (public, verified via HMAC signature)
router.post('/webhook', paymentController.paymobWebhook);

// Authenticated payment actions
router.use(protect);

router.post('/checkout', validate(createCheckoutSchema), paymentController.createCheckout);
router.get('/history', paymentController.getPaymentHistory);

// Admin refunds
router.post(
  '/:id/refund',
  restrictTo('admin'),
  validate(refundPaymentSchema),
  paymentController.adminRefund,
);

export default router;
