import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './helpers.js';
import Subject from '../src/models/Subject.js';
import Room from '../src/models/Room.js';
import Group from '../src/models/Group.js';
import Settings from '../src/models/Settings.js';
import ParentLink from '../src/models/ParentLink.js';
import Enrollment from '../src/models/Enrollment.js';
import Payment from '../src/models/Payment.js';
import TeacherProfile from '../src/models/TeacherProfile.js';
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
  await Settings.create({});
});

describe('Enrollment Business Rules & Payment-Gated Activation', () => {
  let teacher, boyStudent, girlStudent, parent, subject, freeGirlsGroup, paidOpenGroup, paidRequestGroup, paidInviteGroup, fullGroup;
  const testSecret = 'test_hmac_secret_enrollment_123';

  beforeEach(async () => {
    paymobConfig.hmacSecret = testSecret;
    paymobConfig.allowMockPayments = true;
    
    teacher = await createTestUser({ role: 'teacher' });
    await TeacherProfile.create({
      user: teacher.user._id,
      status: 'approved',
      headline: 'Teacher',
      bio: 'Bio',
      subjects: [],
    });
    boyStudent = await createTestUser({ name: 'Boy', gender: 'male', role: 'student' });
    girlStudent = await createTestUser({ name: 'Girl', gender: 'female', role: 'student' });
    parent = await createTestUser({ name: 'Parent', role: 'parent' });

    // Link parent to girlStudent
    await ParentLink.create({
      parent: parent.user._id,
      student: girlStudent.user._id,
      status: 'accepted',
      method: 'code',
    });

    subject = await Subject.create({
      name: { ar: 'القرآن الكريم', en: 'Quran' },
      slug: 'quran',
      type: 'quran',
    });

    const room = await Room.create({ teacher: teacher.user._id, name: 'Room' });

    // 1. Free group (price.amount === 0)
    freeGirlsGroup = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'مجموعة تجريبية للبنات مجانية',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'girls',
      maxStudents: 10,
      price: { amount: 0, currency: 'EGP' },
      schedule: [{ dayOfWeek: 0, startTime: '10:00', endTime: '11:00' }],
      joinMode: 'open',
      joinCode: 'FREEGIRL',
    });

    // 2. Paid open group (price.amount > 0, joinMode: 'open')
    paidOpenGroup = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'مجموعة تجريبية للبنات مفتوحة مدفوعة',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'girls',
      maxStudents: 10,
      price: { amount: 350, currency: 'EGP' },
      schedule: [{ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }],
      joinMode: 'open',
      joinCode: 'PAIDOPEN',
    });

    // 3. Paid request group (price.amount > 0, joinMode: 'request')
    paidRequestGroup = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'مجموعة تجريبية للبنات بطلب انضمام',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'girls',
      maxStudents: 10,
      price: { amount: 400, currency: 'EGP' },
      schedule: [{ dayOfWeek: 3, startTime: '10:00', endTime: '11:00' }],
      joinMode: 'request',
      joinCode: 'PAIDREQ',
    });

    // 4. Paid invite-only group (price.amount > 0, joinMode: 'invite_only')
    paidInviteGroup = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'مجموعة تجريبية دعوة فقط',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'girls',
      maxStudents: 10,
      price: { amount: 500, currency: 'EGP' },
      schedule: [{ dayOfWeek: 4, startTime: '10:00', endTime: '11:00' }],
      joinMode: 'invite_only',
      joinCode: 'INVITEONLY123',
    });

    // 5. Full group
    fullGroup = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'مجموعة ممتلئة',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'boys',
      maxStudents: 1,
      activeMembersCount: 1,
      status: 'full',
      price: { amount: 200, currency: 'EGP' },
      schedule: [{ dayOfWeek: 2, startTime: '10:00', endTime: '11:00' }],
      joinMode: 'open',
    });
  });

  it('should prevent male student from enrolling in girls-only group', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments/request')
      .set('Authorization', `Bearer ${boyStudent.token}`)
      .send({ groupId: freeGirlsGroup._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('female students only');
  });

  it('should reject enrollment when group is full', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments/request')
      .set('Authorization', `Bearer ${boyStudent.token}`)
      .send({ groupId: fullGroup._id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GROUP_FULL');
  });

  it('FREE GROUP: should allow female student to join free group by join code directly into active status', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments/join-by-code')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ code: 'FREEGIRL' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');

    const groupInDb = await Group.findById(freeGirlsGroup._id);
    expect(groupInDb.activeMembersCount).toBe(1);
  });

  it('PAID GROUP (open): joining by code creates awaiting_payment and returns requiresPayment signal', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments/join-by-code')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ code: 'PAIDOPEN' });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresPayment).toBe(true);
    expect(res.body.data.groupId).toBe(String(paidOpenGroup._id));
    expect(res.body.data.studentId).toBe(String(girlStudent.user._id));

    const enrollment = await Enrollment.findOne({ group: paidOpenGroup._id, student: girlStudent.user._id });
    expect(enrollment).toBeDefined();
    expect(enrollment.status).toBe('awaiting_payment');

    const groupInDb = await Group.findById(paidOpenGroup._id);
    expect(groupInDb.activeMembersCount).toBe(0);
  });

  it('PAID GROUP (open): request join creates awaiting_payment and returns requiresPayment signal', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments/request')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ groupId: paidOpenGroup._id });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresPayment).toBe(true);
    expect(res.body.data.groupId).toBe(String(paidOpenGroup._id));
    expect(res.body.data.studentId).toBe(String(girlStudent.user._id));

    const enrollment = await Enrollment.findOne({ group: paidOpenGroup._id, student: girlStudent.user._id });
    expect(enrollment.status).toBe('awaiting_payment');
  });

  it('paid + request: join -> pending; checkout before accept -> 409; accept -> awaiting_payment; checkout OK; signed webhook -> active', async () => {
    // 1. Join request creates pending
    const joinRes = await request(app)
      .post('/api/v1/enrollments/request')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ groupId: paidRequestGroup._id });

    expect(joinRes.status).toBe(201);
    const enrollment = await Enrollment.findOne({ group: paidRequestGroup._id, student: girlStudent.user._id });
    expect(enrollment.status).toBe('pending');

    // 2. Checkout before accept -> 409 ENROLLMENT_NOT_PAYABLE
    const earlyCheckoutRes = await request(app)
      .post('/api/v1/payments/checkout')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ groupId: String(paidRequestGroup._id) });

    expect(earlyCheckoutRes.status).toBe(409);
    expect(earlyCheckoutRes.body.error.code).toBe('ENROLLMENT_NOT_PAYABLE');

    // 3. Teacher accepts -> moves to awaiting_payment
    const acceptRes = await request(app)
      .patch(`/api/v1/enrollments/${enrollment._id}/status`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ action: 'accept' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('awaiting_payment');
    expect(acceptRes.body.data.requiresPayment).toBe(true);

    const awaitingEnrollment = await Enrollment.findById(enrollment._id);
    expect(awaitingEnrollment.status).toBe('awaiting_payment');

    // 4. Checkout OK (mock in dev mode)
    const checkoutRes = await request(app)
      .post('/api/v1/payments/checkout')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ groupId: String(paidRequestGroup._id) });

    expect([200, 201]).toContain(checkoutRes.status);
    expect(checkoutRes.body.data.checkoutUrl).toBeDefined();
    const paymentId = checkoutRes.body.data.paymentId;

    // 5. Signed webhook -> active
    const transactionObj = {
      id: 99112233,
      amount_cents: 40000, // 400 EGP
      currency: 'EGP',
      success: true,
      order: {
        id: 7771,
        merchant_order_id: String(paymentId),
      },
    };

    const validHmac = calculatePaymobHmac(transactionObj, testSecret);

    const webhookRes = await request(app)
      .post(`/api/v1/payments/webhook?hmac=${validHmac}`)
      .send({ obj: transactionObj });

    expect(webhookRes.status).toBe(200);

    const finalEnrollment = await Enrollment.findById(enrollment._id);
    expect(finalEnrollment.status).toBe('active');
    expect(finalEnrollment.subscription.status).toBe('active');

    const updatedGroup = await Group.findById(paidRequestGroup._id);
    expect(updatedGroup.activeMembersCount).toBe(1);
  });

  it('rejected/cancelled student cannot checkout (409 ENROLLMENT_NOT_PAYABLE)', async () => {
    const enrollment = await Enrollment.create({
      group: paidRequestGroup._id,
      student: girlStudent.user._id,
      status: 'cancelled',
      cancellationReason: 'Rejected by teacher',
    });

    const res = await request(app)
      .post('/api/v1/payments/checkout')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ groupId: String(paidRequestGroup._id) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ENROLLMENT_NOT_PAYABLE');
  });

  it('invite_only cannot be joined or paid for without the code', async () => {
    // 1. Direct request without code fails
    const reqRes = await request(app)
      .post('/api/v1/enrollments/request')
      .set('Authorization', `Bearer ${girlStudent.token}`)
      .send({ groupId: paidInviteGroup._id });

    expect(reqRes.status).toBe(400);
    expect(reqRes.body.error.code).toBe('INVITE_ONLY_GROUP');

    // 2. Parent enroll without valid code fails
    const parentNoCodeRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({
        groupId: paidInviteGroup._id,
        studentId: girlStudent.user._id,
        code: 'WRONGCODE',
      });

    expect(parentNoCodeRes.status).toBe(400);
    expect(parentNoCodeRes.body.error.code).toBe('INVALID_JOIN_CODE');

    // 3. Parent enroll with correct code succeeds into awaiting_payment
    const parentOkRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({
        groupId: paidInviteGroup._id,
        studentId: girlStudent.user._id,
        code: 'INVITEONLY123',
      });

    expect(parentOkRes.status).toBe(200);
    expect(parentOkRes.body.data.requiresPayment).toBe(true);
    expect(parentOkRes.body.data.status).toBe('awaiting_payment');
  });

  it('a male student cannot get a checkout URL for a girls group', async () => {
    // Create an awaiting_payment record for boyStudent in girls group (e.g. simulated DB inconsistency)
    await Enrollment.create({
      group: paidOpenGroup._id,
      student: boyStudent.user._id,
      status: 'awaiting_payment',
    });

    const res = await request(app)
      .post('/api/v1/payments/checkout')
      .set('Authorization', `Bearer ${boyStudent.token}`)
      .send({ groupId: String(paidOpenGroup._id) });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('female students only');
  });

  it('teacher/admin can list join requests via GET /groups/:id/members?status=pending, while unauthorized user cannot filter', async () => {
    // Create pending join request
    await Enrollment.create({
      group: paidRequestGroup._id,
      student: girlStudent.user._id,
      status: 'pending',
    });

    // 1. Teacher can query pending members
    const teacherRes = await request(app)
      .get(`/api/v1/groups/${paidRequestGroup._id}/members?status=pending`)
      .set('Authorization', `Bearer ${teacher.token}`);

    expect(teacherRes.status).toBe(200);
    expect(teacherRes.body.data.length).toBe(1);
    expect(teacherRes.body.data[0].status).toBe('pending');

    // 2. Student cannot filter by status (forbidden)
    const studentRes = await request(app)
      .get(`/api/v1/groups/${paidRequestGroup._id}/members?status=pending`)
      .set('Authorization', `Bearer ${girlStudent.token}`);

    expect([403, 404]).toContain(studentRes.status);
  });

  it('updateEnrollmentStatus guards: accept and reject are allowed only when pending, otherwise 409 ENROLLMENT_INVALID_STATE', async () => {
    // 1. Active member of paid group
    const activePaidEnr = await Enrollment.create({
      group: paidOpenGroup._id,
      student: girlStudent.user._id,
      status: 'active',
      joinedAt: new Date(),
    });
    paidOpenGroup.activeMembersCount = 1;
    await paidOpenGroup.save();

    // Teacher attempts to accept already active member
    const acceptPaidRes = await request(app)
      .patch(`/api/v1/enrollments/${activePaidEnr._id}/status`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ action: 'accept' });
    expect(acceptPaidRes.status).toBe(409);
    expect(acceptPaidRes.body.error.code).toBe('ENROLLMENT_INVALID_STATE');

    // Teacher attempts to reject already active member
    const rejectPaidRes = await request(app)
      .patch(`/api/v1/enrollments/${activePaidEnr._id}/status`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ action: 'reject', reason: 'Not allowed' });
    expect(rejectPaidRes.status).toBe(409);
    expect(rejectPaidRes.body.error.code).toBe('ENROLLMENT_INVALID_STATE');

    // Verify activeMembersCount unchanged
    const groupCheck = await Group.findById(paidOpenGroup._id);
    expect(groupCheck.activeMembersCount).toBe(1);

    // 2. Active member of free group
    const activeFreeEnr = await Enrollment.create({
      group: freeGirlsGroup._id,
      student: girlStudent.user._id,
      status: 'active',
      joinedAt: new Date(),
    });
    const acceptFreeRes = await request(app)
      .patch(`/api/v1/enrollments/${activeFreeEnr._id}/status`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ action: 'accept' });
    expect(acceptFreeRes.status).toBe(409);
    expect(acceptFreeRes.body.error.code).toBe('ENROLLMENT_INVALID_STATE');

    // Clean up
    await Enrollment.deleteMany({ _id: { $in: [activePaidEnr._id, activeFreeEnr._id] } });
    paidOpenGroup.activeMembersCount = 0;
    await paidOpenGroup.save();
  });

  it('parentEnrollChild enforces joinMode rules across open, request, and invite_only modes', async () => {
    // A. Mode open:
    // - Paid group -> awaiting_payment with requiresPayment: true (200)
    const openPaidRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ groupId: paidOpenGroup._id, studentId: girlStudent.user._id });
    expect(openPaidRes.status).toBe(200);
    expect(openPaidRes.body.data.requiresPayment).toBe(true);
    expect(openPaidRes.body.data.status).toBe('awaiting_payment');
    await Enrollment.deleteMany({ group: paidOpenGroup._id, student: girlStudent.user._id });

    // - Free group -> active (201)
    const openFreeRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ groupId: freeGirlsGroup._id, studentId: girlStudent.user._id });
    expect(openFreeRes.status).toBe(201);
    expect(openFreeRes.body.data.status).toBe('active');
    await Enrollment.deleteMany({ group: freeGirlsGroup._id, student: girlStudent.user._id });

    // B. Mode request:
    // - Without code -> pending (201)
    const reqNoCodeRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ groupId: paidRequestGroup._id, studentId: girlStudent.user._id });
    expect(reqNoCodeRes.status).toBe(201);
    expect(reqNoCodeRes.body.data.status).toBe('pending');
    await Enrollment.deleteMany({ group: paidRequestGroup._id, student: girlStudent.user._id });

    // - With valid code -> acts as invitation: paid group creates awaiting_payment (200)
    const reqWithCodeRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ groupId: paidRequestGroup._id, studentId: girlStudent.user._id, code: 'PAIDREQ' });
    expect(reqWithCodeRes.status).toBe(200);
    expect(reqWithCodeRes.body.data.requiresPayment).toBe(true);
    expect(reqWithCodeRes.body.data.status).toBe('awaiting_payment');
    await Enrollment.deleteMany({ group: paidRequestGroup._id, student: girlStudent.user._id });

    // C. Mode invite_only:
    // - Without code -> 400 INVALID_JOIN_CODE
    const invNoCodeRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ groupId: paidInviteGroup._id, studentId: girlStudent.user._id });
    expect(invNoCodeRes.status).toBe(400);
    expect(invNoCodeRes.body.error.code).toBe('INVALID_JOIN_CODE');

    // - With valid code -> awaiting_payment (200)
    const invWithCodeRes = await request(app)
      .post('/api/v1/enrollments/parent-enroll')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ groupId: paidInviteGroup._id, studentId: girlStudent.user._id, code: 'INVITEONLY123' });
    expect(invWithCodeRes.status).toBe(200);
    expect(invWithCodeRes.body.data.requiresPayment).toBe(true);
    expect(invWithCodeRes.body.data.status).toBe('awaiting_payment');
    await Enrollment.deleteMany({ group: paidInviteGroup._id, student: girlStudent.user._id });
  });

  it('teacher can remove an approved-but-unpaid student (awaiting_payment)', async () => {
    const awaitingEnr = await Enrollment.create({
      group: paidOpenGroup._id,
      student: girlStudent.user._id,
      status: 'awaiting_payment',
    });

    const initialCount = paidOpenGroup.activeMembersCount;

    const removeRes = await request(app)
      .delete(`/api/v1/groups/${paidOpenGroup._id}/members/${girlStudent.user._id}`)
      .set('Authorization', `Bearer ${teacher.token}`);

    expect(removeRes.status).toBe(200);
    const updatedEnr = await Enrollment.findById(awaitingEnr._id);
    expect(updatedEnr.status).toBe('cancelled');

    const updatedGroup = await Group.findById(paidOpenGroup._id);
    expect(updatedGroup.activeMembersCount).toBe(initialCount);

    await Enrollment.deleteMany({ _id: awaitingEnr._id });
  });
});
