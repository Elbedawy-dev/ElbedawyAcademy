import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as payoutService from '../services/payout.service.js';

export const getTeacherEarningsDashboard = asyncHandler(async (req, res) => {
  const data = await payoutService.getTeacherEarningsDashboard(req.user._id);
  sendSuccess(res, { data });
});

export const listAllPayouts = asyncHandler(async (req, res) => {
  const result = await payoutService.listAllPayouts(req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const updatePayoutStatus = asyncHandler(async (req, res) => {
  const payout = await payoutService.updatePayoutStatus(
    req.params.id,
    req.body,
    req.user,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: `Payout marked as ${req.body.status}`, data: payout });
});

export const triggerCalculatePayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutService.calculateMonthlyPayouts(req.body.period);
  sendSuccess(res, {
    message: `${payouts.length} teacher payouts calculated for period ${req.body.period || 'last month'}`,
    data: payouts,
  });
});

export default {
  getTeacherEarningsDashboard,
  listAllPayouts,
  updatePayoutStatus,
  triggerCalculatePayouts,
};
