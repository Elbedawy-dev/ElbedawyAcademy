import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './helpers.js';
import Subject from '../src/models/Subject.js';
import Room from '../src/models/Room.js';
import Group from '../src/models/Group.js';
import Enrollment from '../src/models/Enrollment.js';
import Payment from '../src/models/Payment.js';
import ParentLink from '../src/models/ParentLink.js';
import paymobConfig from '../src/config/paymob.js';
import { calculatePaymobHmac } from '../src/services/payment.service.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Payments and Paymob Webhook', () => {
  let student, teacher, parent, unrelatedStudent, group, enrollment, payment;
  const testSecret = process.env.PAYMOB_HMAC_SECRET || 'test_paymob_hmac_secret_key_123456';

  beforeEach(async () => {
    paymobConfig.hmacSecret = testSecret;

    teacher = await createTestUser({ role: 'teacher' });
    student = await createTestUser({ role: 'student', gender: 'male' });
    parent = await createTestUser({ role: 'parent' });
    unrelatedStudent = await createTestUser({ role: 'student', gender: 'male' });

    // Link parent and student
    await ParentLink.create({
      parent: parent.user._id,
      student: student.user._id,
      status: 'accepted',
      method: 'code',
      acceptedAt: new Date(),
    });

    const subject = await Subject.create({
      name: { ar: 'القرآن الكريم', en: 'Quran' },
      slug: 'quran',
      type: 'quran',
    });

    const room = await Room.create({ teacher: teacher.user._id, name: 'Room' });

    group = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'حلقة التجويد',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'boys',
      price: { amount: 500, currency: 'EGP' },
      schedule: [{ dayOfWeek: 0, startTime: '16:00', endTime: '17:00' }],
      status: 'open',
      activeMembersCount: 0,
      maxStudents: 15,
    });

    enrollment = await Enrollment.create({
      group: group._id,
      student: student.user._id,
      status: 'awaiting_payment',
    });

    payment = await Payment.create({
      user: student.user._id,
      student: student.user._id,
      group: group._id,
      enrollment: enrollment._id,
      amount: 500,
      currency: 'EGP',
      platformFee: 75,
      teacherAmount: 425,
      status: 'pending',
      paymobOrderId: '987654',
      provider: 'paymob',
      paymentMethod: 'card',
    });
  });

  describe('Webhook HMAC & Security', () => {
    it('should process successful Paymob webhook with valid HMAC and activate subscription', async () => {
      const transactionObj = {
        id: 11223344,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const validHmac = calculatePaymobHmac(transactionObj, testSecret);

      const res = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${validHmac}`)
        .send({ obj: transactionObj });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('paid');

      const updatedEnrollment = await Enrollment.findById(enrollment._id);
      expect(updatedEnrollment.status).toBe('active');
      expect(updatedEnrollment.subscription.status).toBe('active');

      const updatedGroup = await Group.findById(group._id);
      expect(updatedGroup.activeMembersCount).toBe(1);
    });

    it('should reject webhook with 401 INVALID_SIGNATURE when signature is missing', async () => {
      const transactionObj = {
        id: 11223345,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send({ obj: transactionObj });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with 401 INVALID_SIGNATURE when signature is incorrect/tampered', async () => {
      const transactionObj = {
        id: 11223346,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const res = await request(app)
        .post('/api/v1/payments/webhook?hmac=invalid_tampered_signature_12345')
        .send({ obj: transactionObj });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with 401 INVALID_SIGNATURE when PAYMOB_HMAC_SECRET is missing', async () => {
      const originalSecret = paymobConfig.hmacSecret;
      try {
        paymobConfig.hmacSecret = '';

        const transactionObj = {
          id: 11223347,
          amount_cents: 50000,
          currency: 'EGP',
          success: true,
          order: {
            id: 987654,
            merchant_order_id: String(payment._id),
          },
        };

        const res = await request(app)
          .post('/api/v1/payments/webhook?hmac=some_signature')
          .send({ obj: transactionObj });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_SIGNATURE');
      } finally {
        paymobConfig.hmacSecret = originalSecret;
      }
    });

    it('should reject webhook with 400 PAYMENT_AMOUNT_MISMATCH when amount_cents differs', async () => {
      const transactionObj = {
        id: 11223348,
        amount_cents: 25000, // Expected 50000 (500 EGP)
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const validHmac = calculatePaymobHmac(transactionObj, testSecret);

      const res = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${validHmac}`)
        .send({ obj: transactionObj });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    });

    it('replayed webhook does not double count', async () => {
      const transactionObj = {
        id: 99887766,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const validHmac = calculatePaymobHmac(transactionObj, testSecret);

      // First call
      const res1 = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${validHmac}`)
        .send({ obj: transactionObj });
      expect(res1.status).toBe(200);

      const groupAfterFirst = await Group.findById(group._id);
      expect(groupAfterFirst.activeMembersCount).toBe(1);

      // Duplicate callback with same transaction id
      const res2 = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${validHmac}`)
        .send({ obj: transactionObj });
      expect(res2.status).toBe(200);
      expect(res2.body.data.duplicate).toBe(true);

      const groupAfterSecond = await Group.findById(group._id);
      expect(groupAfterSecond.activeMembersCount).toBe(1); // Still 1, never double counted!
    });

    it('failed callback followed by a successful one activates the enrollment', async () => {
      // 1. Initial failed callback (e.g. insufficient funds)
      const failedTransactionObj = {
        id: 33445501,
        amount_cents: 50000,
        currency: 'EGP',
        success: false,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const failHmac = calculatePaymobHmac(failedTransactionObj, testSecret);

      const failRes = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${failHmac}`)
        .send({ obj: failedTransactionObj });

      expect(failRes.status).toBe(200);

      // Payment remains pending (not failed) to allow retry
      const paymentAfterFail = await Payment.findById(payment._id);
      expect(paymentAfterFail.status).toBe('pending');
      expect(paymentAfterFail.failedAttempts.length).toBe(1);

      const enrollmentStillAwaiting = await Enrollment.findById(enrollment._id);
      expect(enrollmentStillAwaiting.status).toBe('awaiting_payment');

      // 2. Subsequent successful callback for the same payment
      const successTransactionObj = {
        id: 33445502,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const successHmac = calculatePaymobHmac(successTransactionObj, testSecret);

      const successRes = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${successHmac}`)
        .send({ obj: successTransactionObj });

      expect(successRes.status).toBe(200);

      const finalPayment = await Payment.findById(payment._id);
      expect(finalPayment.status).toBe('paid');

      const finalEnrollment = await Enrollment.findById(enrollment._id);
      expect(finalEnrollment.status).toBe('active');
    });

    it('two concurrent paid webhooks for the last seat -> one activates, one goes to refund', async () => {
      // Group with maxStudents = 1, activeMembersCount = 0
      group.maxStudents = 1;
      group.activeMembersCount = 0;
      await group.save();

      // Student 1 enrollment & payment
      const student2 = await createTestUser({ role: 'student', gender: 'male' });
      const enrollment2 = await Enrollment.create({
        group: group._id,
        student: student2.user._id,
        status: 'awaiting_payment',
      });
      const payment2 = await Payment.create({
        user: student2.user._id,
        student: student2.user._id,
        group: group._id,
        enrollment: enrollment2._id,
        amount: 500,
        currency: 'EGP',
        platformFee: 75,
        teacherAmount: 425,
        status: 'pending',
        paymobOrderId: '987655',
        provider: 'paymob',
        paymentMethod: 'card',
      });

      const trans1 = {
        id: 771101,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: { id: 987654, merchant_order_id: String(payment._id) },
      };
      const trans2 = {
        id: 771102,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: { id: 987655, merchant_order_id: String(payment2._id) },
      };

      const hmac1 = calculatePaymobHmac(trans1, testSecret);
      const hmac2 = calculatePaymobHmac(trans2, testSecret);

      // Trigger webhooks in parallel
      const [res1, res2] = await Promise.all([
        request(app).post(`/api/v1/payments/webhook?hmac=${hmac1}`).send({ obj: trans1 }),
        request(app).post(`/api/v1/payments/webhook?hmac=${hmac2}`).send({ obj: trans2 }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const [p1, p2, e1, e2, g] = await Promise.all([
        Payment.findById(payment._id),
        Payment.findById(payment2._id),
        Enrollment.findById(enrollment._id),
        Enrollment.findById(enrollment2._id),
        Group.findById(group._id),
      ]);

      // Exactly ONE activated, and exactly ONE went to refund
      const activeCount = [e1.status, e2.status].filter((s) => s === 'active').length;
      const refundCount = [p1.needsRefund, p2.needsRefund].filter(Boolean).length;

      expect(activeCount).toBe(1);
      expect(refundCount).toBe(1);
      expect(g.activeMembersCount).toBe(1);
      expect(g.status).toBe('full');
    });

    it('webhook for enrollment not awaiting_payment -> flags payment for refund', async () => {
      // Set enrollment to cancelled
      enrollment.status = 'cancelled';
      await enrollment.save();

      const transactionObj = {
        id: 55443322,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: {
          id: 987654,
          merchant_order_id: String(payment._id),
        },
      };

      const validHmac = calculatePaymobHmac(transactionObj, testSecret);

      const res = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${validHmac}`)
        .send({ obj: transactionObj });

      expect(res.status).toBe(200);
      expect(res.body.data.refunded).toBe(true);

      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.needsRefund).toBe(true);
      expect(updatedPayment.refundReason).toContain('Enrollment is not awaiting payment');

      // Enrollment must remain cancelled
      const finalEnrollment = await Enrollment.findById(enrollment._id);
      expect(finalEnrollment.status).toBe('cancelled');
    });

    it('duplicate webhook: two checkouts created before first payment, both paid -> second flagged as DUPLICATE_PAYMENT', async () => {
      expect(enrollment.status).toBe('awaiting_payment');

      const payment2 = await Payment.create({
        user: student.user._id,
        student: student.user._id,
        group: group._id,
        enrollment: enrollment._id,
        amount: 500,
        currency: 'EGP',
        platformFee: 75,
        teacherAmount: 425,
        status: 'pending',
        paymobOrderId: '987659',
        provider: 'paymob',
        paymentMethod: 'card',
      });

      const trans1 = {
        id: 881101,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: { id: 987654, merchant_order_id: String(payment._id) },
      };
      const hmac1 = calculatePaymobHmac(trans1, testSecret);
      const res1 = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${hmac1}`)
        .send({ obj: trans1 });
      expect(res1.status).toBe(200);

      const enrAfterFirst = await Enrollment.findById(enrollment._id);
      expect(enrAfterFirst.status).toBe('active');
      const initialEndDate = enrAfterFirst.subscription.endDate;
      const initialMembersCount = (await Group.findById(group._id)).activeMembersCount;

      const trans2 = {
        id: 881102,
        amount_cents: 50000,
        currency: 'EGP',
        success: true,
        order: { id: 987659, merchant_order_id: String(payment2._id) },
      };
      const hmac2 = calculatePaymobHmac(trans2, testSecret);
      const res2 = await request(app)
        .post(`/api/v1/payments/webhook?hmac=${hmac2}`)
        .send({ obj: trans2 });
      expect(res2.status).toBe(200);
      expect(res2.body.data.refunded).toBe(true);
      expect(res2.body.data.reason).toBe('DUPLICATE_PAYMENT');

      const p2Updated = await Payment.findById(payment2._id);
      expect(p2Updated.needsRefund).toBe(true);
      expect(p2Updated.refundReason).toBe('DUPLICATE_PAYMENT');

      const enrAfterSecond = await Enrollment.findById(enrollment._id);
      expect(enrAfterSecond.subscription.endDate.getTime()).toBe(initialEndDate.getTime());
      const groupAfterSecond = await Group.findById(group._id);
      expect(groupAfterSecond.activeMembersCount).toBe(initialMembersCount);
    });
  });

  describe('POST /api/v1/payments/checkout Authorization & Provider checks', () => {

    it('should allow any authenticated user to checkout for an existing student in awaiting_payment', async () => {
      const origApiKey = paymobConfig.apiKey;
      const origBaseUrl = paymobConfig.baseUrl;
      try {
        paymobConfig.apiKey = 'test_paymob_api_key_valid';
        paymobConfig.baseUrl = 'http://127.0.0.1:1'; // network fail -> tests auth succeeded

        const res = await request(app)
          .post('/api/v1/payments/checkout')
          .set('Authorization', `Bearer ${unrelatedStudent.token}`)
          .send({
            groupId: String(group._id),
            studentId: String(student.user._id), // unrelated user paying for student
          });

        expect(res.status).toBe(502);
        expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
      } finally {
        paymobConfig.apiKey = origApiKey;
        paymobConfig.baseUrl = origBaseUrl;
      }
    });

    it('should reject checkout with 400 INVALID_STUDENT if target studentId is not a valid student', async () => {
      const res = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          groupId: String(group._id),
          studentId: String(teacher.user._id), // teacher is not a student
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STUDENT');
    });

    it('should reject checkout when Paymob is unconfigured (returns 503 PAYMENT_NOT_CONFIGURED)', async () => {
      const origApiKey = paymobConfig.apiKey;
      try {
        paymobConfig.apiKey = '';

        const res = await request(app)
          .post('/api/v1/payments/checkout')
          .set('Authorization', `Bearer ${student.token}`)
          .send({
            groupId: String(group._id),
          });

        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('PAYMENT_NOT_CONFIGURED');
      } finally {
        paymobConfig.apiKey = origApiKey;
      }
    });

    it('should reject checkout with 503 if iframeId or cardIntegrationId is missing', async () => {
      const origIframeId = paymobConfig.iframeId;
      try {
        paymobConfig.iframeId = '';

        const res = await request(app)
          .post('/api/v1/payments/checkout')
          .set('Authorization', `Bearer ${student.token}`)
          .send({
            groupId: String(group._id),
          });

        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('PAYMENT_NOT_CONFIGURED');
      } finally {
        paymobConfig.iframeId = origIframeId;
      }
    });

    it('should mark payment failed and return 502 PAYMENT_PROVIDER_ERROR when Paymob call fails (no fake URL)', async () => {
      const origApiKey = paymobConfig.apiKey;
      const origBaseUrl = paymobConfig.baseUrl;
      try {
        paymobConfig.apiKey = 'test_paymob_api_key_valid';
        paymobConfig.baseUrl = 'http://127.0.0.1:1';

        const res = await request(app)
          .post('/api/v1/payments/checkout')
          .set('Authorization', `Bearer ${student.token}`)
          .send({
            groupId: String(group._id),
          });

        expect(res.status).toBe(502);
        expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
        expect(res.body.data?.checkoutUrl).toBeUndefined();

        const failedPayment = await Payment.findOne({ user: student.user._id }).sort({ createdAt: -1 });
        expect(failedPayment.status).toBe('failed');
      } finally {
        paymobConfig.apiKey = origApiKey;
        paymobConfig.baseUrl = origBaseUrl;
      }
    });

    it('should reject checkout with 409 ENROLLMENT_NOT_PAYABLE if student has active enrollment', async () => {
      enrollment.status = 'active';
      await enrollment.save();

      const res = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          groupId: String(group._id),
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ENROLLMENT_NOT_PAYABLE');
    });

    it('should reject checkout with 400 GROUP_CLOSED if group is closed', async () => {
      group.status = 'closed';
      await group.save();

      const res = await request(app)
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          groupId: String(group._id),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('GROUP_CLOSED');
    });
  });
});
