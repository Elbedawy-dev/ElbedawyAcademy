import Payout from '../models/Payout.js';
import Payment from '../models/Payment.js';
import Group from '../models/Group.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { periodRange, previousPeriod } from '../utils/time.js';
import { sendNotificationToUser } from './notification.service.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

export async function calculateMonthlyPayouts(period = previousPeriod()) {
  const { start, end } = periodRange(period);

  // Find all successful payments in the period
  const payments = await Payment.find({
    status: 'paid',
    paidAt: { $gte: start, $lt: end },
  }).populate('group', 'teacher');

  const teacherEarningsMap = new Map(); // teacherId -> { gross, platformFee, net }

  for (const p of payments) {
    if (!p.group?.teacher) continue;
    const tId = String(p.group.teacher);
    const existing = teacherEarningsMap.get(tId) || {
      teacherId: tId,
      grossAmount: 0,
      platformFee: 0,
      netAmount: 0,
      currency: p.currency || 'EGP',
    };

    existing.grossAmount += p.amount;
    existing.platformFee += p.platformFee;
    existing.netAmount += p.teacherAmount;
    teacherEarningsMap.set(tId, existing);
  }

  const generatedPayouts = [];

  for (const item of teacherEarningsMap.values()) {
    const payout = await Payout.findOneAndUpdate(
      { teacher: item.teacherId, period },
      {
        teacher: item.teacherId,
        period,
        grossAmount: Math.round(item.grossAmount * 100) / 100,
        platformFee: Math.round(item.platformFee * 100) / 100,
        netAmount: Math.round(item.netAmount * 100) / 100,
        currency: item.currency,
        status: 'pending',
      },
      { upsert: true, new: true },
    );
    generatedPayouts.push(payout);
  }

  return generatedPayouts;
}

export async function updatePayoutStatus(payoutId, { status, reference, notes }, adminUser, actorMeta = {}) {
  const payout = await Payout.findById(payoutId).populate('teacher', 'name email');
  if (!payout) throw AppError.notFound('Payout not found');

  payout.status = status;
  if (reference) payout.reference = reference;
  if (notes) payout.notes = notes;

  if (status === 'approved') {
    payout.approvedBy = adminUser._id;
  } else if (status === 'paid') {
    payout.paidAt = new Date();
    payout.processedBy = adminUser._id;

    sendNotificationToUser(payout.teacher._id, {
      type: 'payout_paid',
      data: {
        amount: payout.netAmount,
        currency: payout.currency,
        period: payout.period,
      },
    }).catch(() => {});
  }

  await payout.save();

  await AuditLog.create({
    actor: adminUser._id,
    action: status === 'paid' ? AUDIT_ACTIONS.PAYOUT_PAID : AUDIT_ACTIONS.PAYOUT_APPROVED,
    entity: 'Payout',
    entityId: payout._id,
    meta: { teacherId: payout.teacher._id, amount: payout.netAmount, period: payout.period },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  return payout;
}

export async function getTeacherEarningsDashboard(teacherId) {
  const [payouts, currentMonthPayments] = await Promise.all([
    Payout.find({ teacher: teacherId }).sort({ period: -1 }),
    Payment.find({
      status: 'paid',
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }).populate({
      path: 'group',
      match: { teacher: teacherId },
      select: 'teacher',
    }),
  ]);

  const teacherCurrentPayments = currentMonthPayments.filter((p) => Boolean(p.group));
  const currentMonthEstimatedGross = teacherCurrentPayments.reduce((acc, p) => acc + p.amount, 0);
  const currentMonthEstimatedNet = teacherCurrentPayments.reduce((acc, p) => acc + p.teacherAmount, 0);

  const totalPaidEarnings = payouts
    .filter((p) => p.status === 'paid')
    .reduce((acc, p) => acc + p.netAmount, 0);

  return {
    currentMonth: {
      estimatedGross: Math.round(currentMonthEstimatedGross * 100) / 100,
      estimatedNet: Math.round(currentMonthEstimatedNet * 100) / 100,
      paymentCount: teacherCurrentPayments.length,
    },
    totalPaidEarnings: Math.round(totalPaidEarnings * 100) / 100,
    payoutsHistory: payouts,
  };
}

export async function listAllPayouts(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.period) filter.period = query.period;
  if (query.status) filter.status = query.status;
  if (query.teacherId) filter.teacher = query.teacherId;

  const [data, total] = await Promise.all([
    Payout.find(filter)
      .populate('teacher', 'name avatar email phone')
      .sort({ period: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payout.countDocuments(filter),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export default {
  calculateMonthlyPayouts,
  updatePayoutStatus,
  getTeacherEarningsDashboard,
  listAllPayouts,
};
