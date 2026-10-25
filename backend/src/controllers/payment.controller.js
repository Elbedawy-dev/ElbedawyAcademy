import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as paymentService from '../services/payment.service.js';

export const createCheckout = asyncHandler(async (req, res) => {
  const result = await paymentService.createCheckout(req.user, req.body);
  sendCreated(res, { message: 'Checkout session created', data: result });
});

export const paymobWebhook = asyncHandler(async (req, res) => {
  const hmacHeader = req.query.hmac || req.headers['x-paymob-hmac'];
  const result = await paymentService.handlePaymobWebhook(req.body, hmacHeader);
  sendSuccess(res, { data: result });
});

export const adminRefund = asyncHandler(async (req, res) => {
  const payment = await paymentService.adminRefundPayment(
    req.params.id,
    req.body.reason,
    req.user,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: 'Payment refunded successfully', data: payment });
});

export const getPaymentHistory = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentHistory(req.user, req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export default {
  createCheckout,
  paymobWebhook,
  adminRefund,
  getPaymentHistory,
};
