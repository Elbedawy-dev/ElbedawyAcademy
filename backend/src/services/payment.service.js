import crypto from 'node:crypto';
import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import ParentLink from '../models/ParentLink.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import paymobConfig from '../config/paymob.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { runInTransaction } from '../utils/transaction.js';
import { sendNotificationToUser } from './notification.service.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';

const HMAC_KEYS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
];

export function calculatePaymobHmac(data, secret) {
  if (!secret) return '';
  let concatenated = '';
  for (const k of HMAC_KEYS) {
    const parts = k.split('.');
    let val = data;
    for (const p of parts) {
      val = val?.[p];
    }
    concatenated += val !== undefined && val !== null ? String(val) : '';
  }
  return crypto.createHmac('sha512', secret).update(concatenated).digest('hex');
}

/**
 * Calculates Paymob HMAC SHA512 signature from transaction callback data
 * and compares it in constant time.
 */
export function verifyPaymobHmac(data, receivedHmac) {
  if (!paymobConfig.hmacSecret || !receivedHmac) return false;

  const calculatedHmac = calculatePaymobHmac(data, paymobConfig.hmacSecret);
  const calcBuf = Buffer.from(calculatedHmac.toLowerCase(), 'utf8');
  const recvBuf = Buffer.from(String(receivedHmac).toLowerCase(), 'utf8');

  if (calcBuf.length !== recvBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(calcBuf, recvBuf);
}

export async function createCheckout(payerUser, { groupId, studentId, paymentMethod = 'card' }) {
  const targetStudentId = studentId ? String(studentId) : String(payerUser._id);

  // 1. Target student must be an existing user with role 'student'
  const targetStudent = await User.findOne({ _id: targetStudentId, deletedAt: null });
  if (!targetStudent || targetStudent.role !== 'student') {
    throw AppError.badRequest('Target student not found or user is not a student', undefined, 'INVALID_STUDENT');
  }

  // 2. Group must exist and not be deleted
  const group = await Group.findOne({ _id: groupId, deletedAt: null });
  if (!group) {
    throw AppError.notFound('Group not found');
  }

  // 3. Group must not be closed
  if (group.status === 'closed') {
    throw AppError.badRequest('This group is closed', undefined, 'GROUP_CLOSED');
  }

  // 4. Group must not be full
  if (group.status === 'full' || (group.maxStudents && group.activeMembersCount >= group.maxStudents)) {
    throw AppError.badRequest('This group is full', undefined, 'GROUP_FULL');
  }

  // 5. Gender segregation check
  if (group.genderType === 'boys' && targetStudent.gender !== 'male') {
    throw AppError.badRequest('This group is designated for male students only');
  }
  if (group.genderType === 'girls' && targetStudent.gender !== 'female') {
    throw AppError.badRequest('This group is designated for female students only');
  }

  // 6. Accept ONLY an enrollment in awaiting_payment for (groupId, studentId); otherwise 409 ENROLLMENT_NOT_PAYABLE
  // Never create enrollments inside checkout!
  const enrollment = await Enrollment.findOne({ group: groupId, student: targetStudentId });
  if (!enrollment || enrollment.status !== 'awaiting_payment') {
    throw AppError.conflict('Enrollment is not in awaiting_payment status', undefined, 'ENROLLMENT_NOT_PAYABLE');
  }

  // 7. When a new checkout is created for the same enrollment, mark older pending payments for it as expired
  await Payment.updateMany(
    { enrollment: enrollment._id, status: 'pending' },
    { $set: { status: 'expired' } },
  );

  const settings = await Settings.getSettings();
  const commissionPercent = settings.platformCommissionPercent || 15;

  const amount = group.price.amount;
  const currency = group.price.currency || 'EGP';
  const platformFee = Math.round((amount * (commissionPercent / 100)) * 100) / 100;
  const teacherAmount = Math.round((amount - platformFee) * 100) / 100;

  const payment = await Payment.create({
    user: payerUser._id,
    student: targetStudentId,
    group: groupId,
    enrollment: enrollment._id,
    amount,
    currency,
    platformFee,
    teacherAmount,
    status: 'pending',
    paymentMethod,
    provider: 'paymob',
  });

  const amountCents = Math.round(amount * 100);

  // Requirement 5: paymobConfig.isConfigured must also require iframeId and the integration id for the requested payment method
  const isMethodConfigured = paymobConfig.isConfiguredForMethod
    ? paymobConfig.isConfiguredForMethod(paymentMethod)
    : (paymobConfig.isConfigured && paymobConfig.iframeId && (paymentMethod === 'wallet' ? paymobConfig.walletIntegrationId : paymobConfig.cardIntegrationId));

  if (isMethodConfigured) {
    try {
      // 1. Authenticate with Paymob
      const authRes = await fetch(`${paymobConfig.baseUrl}/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: paymobConfig.apiKey }),
      });
      if (!authRes.ok) {
        throw new Error(`Paymob auth returned status ${authRes.status}`);
      }
      const authData = await authRes.json();
      const authToken = authData?.token;
      if (!authToken) {
        throw new Error('Missing auth token from Paymob response');
      }

      // 2. Register Order
      const orderRes = await fetch(`${paymobConfig.baseUrl}/ecommerce/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: false,
          amount_cents: amountCents,
          currency,
          merchant_order_id: String(payment._id),
          items: [
            {
              name: group.name,
              amount_cents: amountCents,
              description: `Subscription for ${group.name}`,
              quantity: 1,
            },
          ],
        }),
      });
      if (!orderRes.ok) {
        throw new Error(`Paymob order creation returned status ${orderRes.status}`);
      }
      const orderData = await orderRes.json();
      if (!orderData?.id) {
        throw new Error('Missing order id from Paymob response');
      }

      // 3. Payment Key Request
      const integrationId =
        paymentMethod === 'wallet'
          ? paymobConfig.walletIntegrationId
          : paymobConfig.cardIntegrationId;

      const keyRes = await fetch(`${paymobConfig.baseUrl}/acceptance/payment_keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: orderData.id,
          billing_data: {
            first_name: payerUser.name.split(' ')[0] || 'User',
            last_name: payerUser.name.split(' ')[1] || 'Academy',
            email: payerUser.email || 'student@elbedawy-academy.com',
            phone_number: payerUser.phone || '01000000000',
            apartment: 'NA',
            floor: 'NA',
            street: payerUser.address?.street || 'NA',
            building: 'NA',
            shipping_method: 'PKG',
            postal_code: 'NA',
            city: payerUser.address?.city || 'Cairo',
            country: payerUser.address?.country || 'EGY',
            state: payerUser.address?.governorate || 'Cairo',
          },
          currency,
          integration_id: integrationId,
        }),
      });
      if (!keyRes.ok) {
        throw new Error(`Paymob payment key returned status ${keyRes.status}`);
      }
      const keyData = await keyRes.json();
      const paymentToken = keyData?.token;
      if (!paymentToken) {
        throw new Error('Missing payment token from Paymob response');
      }

      payment.paymobOrderId = String(orderData.id);
      payment.providerRef = paymentToken;
      await payment.save();

      const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobConfig.iframeId}?payment_token=${paymentToken}`;

      return {
        paymentId: String(payment._id),
        paymentToken,
        checkoutUrl: iframeUrl,
        amount,
        currency,
        isMock: false,
      };
    } catch (err) {
      logger.error(`Paymob checkout generation error: ${err.message}`);
      payment.status = 'failed';
      await payment.save();
      throw new AppError('Payment provider error', 502, 'PAYMENT_PROVIDER_ERROR');
    }
  }

  // Paymob is not configured
  if (paymobConfig.allowMockPayments || (env.isDevelopment && env.ALLOW_MOCK_PAYMENTS)) {
    logger.warn('Paymob is not configured. Returning MOCK checkout because ALLOW_MOCK_PAYMENTS=true in development.');
    const mockToken = `mock_paymob_token_${payment._id}_${Date.now()}`;
    payment.providerRef = mockToken;
    payment.paymobOrderId = `mock_order_${payment._id}`;
    await payment.save();

    return {
      paymentId: String(payment._id),
      paymentToken: mockToken,
      checkoutUrl: `${paymobConfig.returnUrl}?payment_id=${payment._id}&mock=true`,
      amount,
      currency,
      isMock: true,
    };
  }

  throw new AppError('Payment provider is not configured', 503, 'PAYMENT_NOT_CONFIGURED');
}

export async function handlePaymobWebhook(payload, hmacHeader) {
  if (!paymobConfig.hmacSecret || !hmacHeader) {
    throw AppError.unauthorized('Invalid or missing Paymob HMAC signature', 'INVALID_SIGNATURE');
  }

  const transaction = payload?.obj || payload;
  if (!transaction) {
    throw AppError.badRequest('Invalid webhook payload format');
  }

  if (!verifyPaymobHmac(transaction, hmacHeader)) {
    throw AppError.unauthorized('Invalid or missing Paymob HMAC signature', 'INVALID_SIGNATURE');
  }

  const orderId = transaction.order?.id || transaction.order_id;
  const merchantOrderId = transaction.order?.merchant_order_id;
  const success = Boolean(transaction.success);
  const transactionId = String(transaction.id);

  const query = {};
  if (merchantOrderId) query._id = merchantOrderId;
  else if (orderId) query.paymobOrderId = String(orderId);

  const payment = await Payment.findOne(query);
  if (!payment) {
    logger.warn(`No matching payment found for Paymob order: ${orderId || merchantOrderId}`);
    return { success: false, notFound: true };
  }

  // Idempotency: A replayed webhook must never double count
  if (payment.status === 'paid' || payment.paymobTransactionId === transactionId) {
    logger.info(`Webhook payment transaction ${transactionId} already processed. Skipping duplicate.`);
    return { success: true, duplicate: true };
  }

  // Check amount_cents and currency match stored Payment (amount * 100)
  const expectedAmountCents = Math.round(payment.amount * 100);
  const receivedAmountCents = Number(transaction.amount_cents);
  const expectedCurrency = String(payment.currency || '').toUpperCase();
  const receivedCurrency = String(transaction.currency || '').toUpperCase();

  if (receivedAmountCents !== expectedAmountCents || receivedCurrency !== expectedCurrency) {
    logger.error(
      `Payment amount/currency mismatch: expected ${expectedAmountCents} ${expectedCurrency}, got ${receivedAmountCents} ${receivedCurrency}`,
    );
    throw AppError.badRequest('Payment amount or currency mismatch', undefined, 'PAYMENT_AMOUNT_MISMATCH');
  }

  // Requirement 4(c): Do not mark a payment failed on a single failed callback.
  // Keep it pending, record the attempt, and let a later successful callback for the same payment activate.
  if (!success) {
    payment.webhookPayload = payload;
    if (!payment.failedAttempts) payment.failedAttempts = [];
    payment.failedAttempts.push({
      transactionId,
      date: new Date(),
    });
    await payment.save();
    logger.warn(`Payment ${payment._id} callback was not successful. Kept as pending for retry.`);
    return { success: true, pendingRetry: true };
  }

  // Successful callback
  payment.paymobTransactionId = transactionId;
  payment.webhookPayload = payload;

  const enrollment = await Enrollment.findById(payment.enrollment);

  const isAwaiting = enrollment && enrollment.status === 'awaiting_payment';
  const isActiveAlready = enrollment && enrollment.status === 'active';

  // Requirement 4(a) & Requirement 5: Activate only if enrollment is awaiting_payment.
  // If already active, it is a DUPLICATE_PAYMENT; flag needsRefund and do not touch subscription.
  if (!enrollment || !isAwaiting) {
    const reason = isActiveAlready
      ? 'DUPLICATE_PAYMENT'
      : `Enrollment is not awaiting payment (status: ${enrollment?.status || 'missing'})`;
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.needsRefund = true;
    payment.refundReason = reason;
    await payment.save();

    logger.warn(`Payment ${payment._id} cannot activate enrollment: ${reason}. Flagged for refund.`);

    const adminBodyAr = reason === 'DUPLICATE_PAYMENT'
      ? 'دفعة مكررة لاشتراك نشط بالفعل (DUPLICATE_PAYMENT)'
      : `مطلوب استرداد دفعة: ${reason}`;
    const payerBodyAr = reason === 'DUPLICATE_PAYMENT'
      ? 'تم تحويل الدفعة للاسترداد نظراً لوجود اشتراك نشط بالفعل'
      : `تم تحويل دفعتك للاسترداد: ${reason}`;

    const admins = await User.find({ role: 'admin', isActive: true });
    for (const a of admins) {
      sendNotificationToUser(a._id, {
        type: 'broadcast',
        title: { ar: 'مطلوب استرداد دفعة', en: 'Payment Refund Required' },
        body: { ar: adminBodyAr, en: reason },
        data: { paymentId: String(payment._id), reason },
      }).catch(() => {});
    }

    sendNotificationToUser(payment.user, {
      type: 'payment_refunded',
      title: { ar: 'تم تحويل دفعتك للاسترداد', en: 'Payment Flagged for Refund' },
      body: { ar: payerBodyAr, en: reason },
      data: { paymentId: String(payment._id), amount: payment.amount, reason },
    }).catch(() => {});

    return { success: true, refunded: true, reason };
  }

  // Requirement 4(b): Re-check capacity inside runInTransaction and update activeMembersCount atomically.
  let refundNeeded = false;
  let refundReason = '';

  await runInTransaction(async (session) => {
    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: payment.group,
        $expr: { $lt: ['$activeMembersCount', '$maxStudents'] },
      },
      {
        $inc: { activeMembersCount: 1 },
      },
      { session, new: true },
    );

    if (!updatedGroup) {
      refundNeeded = true;
      refundReason = 'Group capacity reached (no seats available)';
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.needsRefund = true;
      payment.refundReason = refundReason;
      await payment.save({ session });
      return;
    }

    if (updatedGroup.activeMembersCount >= updatedGroup.maxStudents) {
      updatedGroup.status = 'full';
      await updatedGroup.save({ session });
    }

    // Activate enrollment
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save({ session });

    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await Enrollment.findByIdAndUpdate(
      payment.enrollment,
      {
        status: 'active',
        joinedAt: enrollment.joinedAt || new Date(),
        'subscription.status': 'active',
        'subscription.startDate': startDate,
        'subscription.endDate': endDate,
        'subscription.lastPayment': payment._id,
      },
      { session },
    );
  });

  if (refundNeeded) {
    logger.warn(`Payment ${payment._id} flagged for refund: ${refundReason}`);
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const a of admins) {
      sendNotificationToUser(a._id, {
        type: 'broadcast',
        title: { ar: 'مطلوب استرداد دفعة', en: 'Payment Refund Required' },
        body: { ar: 'اكتمال العدد في المجموعة (لا توجد مقاعد شاغرة)', en: refundReason },
        data: { paymentId: String(payment._id), reason: refundReason },
      }).catch(() => {});
    }
    sendNotificationToUser(payment.user, {
      type: 'payment_refunded',
      title: { ar: 'تم تحويل دفعتك للاسترداد', en: 'Payment Flagged for Refund' },
      body: { ar: 'تم تحويل دفعتك للاسترداد بسبب اكتمال العدد في المجموعة', en: refundReason },
      data: { paymentId: String(payment._id), amount: payment.amount, reason: refundReason },
    }).catch(() => {});
    return { success: true, refunded: true, reason: refundReason };
  }
  const [group, payerUser] = await Promise.all([
    Group.findById(payment.group),
    User.findById(payment.user),
  ]);

  const groupName = group?.name || 'المجموعة';

  sendNotificationToUser(payment.user, {
    type: 'payment_success',
    data: {
      amount: payment.amount,
      currency: payment.currency,
      groupName,
    },
  }).catch(() => {});

  if (payerUser?.email) {
    sendTemplateEmail(payerUser.email, 'generic', {
      title: 'تم استلام الدفعة بنجاح',
      message: `تم سداد مبلغ ${payment.amount} ${payment.currency} بنجاح مقابل الاشتراك في مجموعة "${groupName}".`,
    }).catch(() => {});
  }

  return { success: true };
}

export async function adminRefundPayment(paymentId, reason, adminUser, actorMeta = {}) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw AppError.notFound('Payment not found');

  if (payment.status !== 'paid') {
    throw AppError.badRequest('Only paid payments can be refunded');
  }

  payment.status = 'refunded';
  payment.refundedAt = new Date();
  payment.refundReason = reason;
  payment.refundedBy = adminUser._id;
  await payment.save();

  // Pause or cancel enrollment
  await Enrollment.findByIdAndUpdate(payment.enrollment, {
    'subscription.status': 'expired',
    status: 'paused',
  });

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
    entity: 'Payment',
    entityId: payment._id,
    meta: { amount: payment.amount, currency: payment.currency, reason },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  sendNotificationToUser(payment.user, {
    type: 'payment_refunded',
    data: { amount: payment.amount, currency: payment.currency },
  }).catch(() => {});

  return payment;
}

export async function getPaymentHistory(currentUser, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let filter = {};
  if (currentUser.role === 'admin') {
    if (query.userId) filter.user = query.userId;
    if (query.status) filter.status = query.status;
  } else {
    filter = { user: currentUser._id };
  }

  const [data, total] = await Promise.all([
    Payment.find(filter)
      .populate('group', 'name')
      .populate('student', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
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
  calculatePaymobHmac,
  verifyPaymobHmac,
  createCheckout,
  handlePaymobWebhook,
  adminRefundPayment,
  getPaymentHistory,
};
