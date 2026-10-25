
import supertest from 'supertest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import env from '../src/config/env.js';
import paymobConfig from '../src/config/paymob.js';
import User from '../src/models/User.js';
import Group from '../src/models/Group.js';
import Enrollment from '../src/models/Enrollment.js';
import Room from '../src/models/Room.js';
import Subject from '../src/models/Subject.js';
import TeacherProfile from '../src/models/TeacherProfile.js';

// Enable mock payments for sample generation in development
paymobConfig.allowMockPayments = true;

await mongoose.connect(env.MONGO_URI);
const request = supertest(app);

// 1. Log in student1
const studentLoginRes = await request.post('/api/v1/auth/login').send({
  email: 'student1@elbedawy-academy.com',
  password: 'Password123!'
});
const studentToken = studentLoginRes.body.data.tokens.accessToken;
const studentUser = studentLoginRes.body.data.user;

// 2. Log in teacher
const teacherLoginRes = await request.post('/api/v1/auth/login').send({
  email: 'ahmed.elbedawy@academy.com',
  password: 'Password123!'
});
const teacherToken = teacherLoginRes.body.data.tokens.accessToken;
const teacherUser = teacherLoginRes.body.data.user;

// Ensure room and subject exist for test group
let subject = await Subject.findOne({ type: 'quran' });
let room = await Room.findOne({ teacher: teacherUser.id || teacherUser._id });
if (!room) {
  room = await Room.create({ teacher: teacherUser.id || teacherUser._id, name: 'Main Room' });
}

// Ensure teacher profile is approved
await TeacherProfile.findOneAndUpdate(
  { user: teacherUser.id || teacherUser._id },
  { status: 'approved' },
  { upsert: true }
);

// Group A: Paid Open Group
let paidOpenGroup = await Group.findOne({ joinMode: 'open', 'price.amount': { $gt: 0 }, deletedAt: null });
if (!paidOpenGroup) {
  paidOpenGroup = await Group.create({
    room: room._id,
    teacher: teacherUser.id || teacherUser._id,
    name: '?????? ??????? ????????',
    subject: subject._id,
    gradeLevel: 'intermediate',
    genderType: 'boys',
    maxStudents: 15,
    price: { amount: 350, currency: 'EGP', billingCycle: 'monthly' },
    schedule: [{ dayOfWeek: 0, startTime: '16:00', endTime: '17:00' }],
    joinMode: 'open',
    status: 'open',
  });
}

// Clean any previous enrollment for student1 in paidOpenGroup
await Enrollment.deleteMany({ group: paidOpenGroup._id, student: studentUser.id || studentUser._id });

// A. CALL API: POST /api/v1/enrollments/request on paid open group
const enrRes = await request
  .post('/api/v1/enrollments/request')
  .set('Authorization', `Bearer ${studentToken}`)
  .send({ groupId: String(paidOpenGroup._id) });

console.log('Enrollment request status:', enrRes.status);
fs.writeFileSync('E:/Elbedawy Academy/docs/samples/enrollments.json', JSON.stringify(enrRes.body, null, 2), 'utf8');

// B. CALL API: POST /api/v1/payments/checkout for student1 in paidOpenGroup
const checkoutRes = await request
  .post('/api/v1/payments/checkout')
  .set('Authorization', `Bearer ${studentToken}`)
  .send({
    groupId: String(paidOpenGroup._id),
    paymentMethod: 'card'
  });

console.log('Checkout status:', checkoutRes.status);
fs.writeFileSync('E:/Elbedawy Academy/docs/samples/payments-checkout.json', JSON.stringify(checkoutRes.body, null, 2), 'utf8');

// Group B: Paid Request Group
let paidReqGroup = await Group.findOne({ joinMode: 'request', 'price.amount': { $gt: 0 }, deletedAt: null });
if (!paidReqGroup) {
  paidReqGroup = await Group.create({
    room: room._id,
    teacher: teacherUser.id || teacherUser._id,
    name: '???? ??????? ??????? (???? ??????)',
    subject: subject._id,
    gradeLevel: 'intermediate',
    genderType: 'boys',
    maxStudents: 10,
    price: { amount: 450, currency: 'EGP', billingCycle: 'monthly' },
    schedule: [{ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' }],
    joinMode: 'request',
    joinCode: 'QURANREQ10',
    status: 'open',
  });
}

// Clean previous enrollment for student2 in paidReqGroup
const student2LoginRes = await request.post('/api/v1/auth/login').send({
  email: 'student2@elbedawy-academy.com',
  password: 'Password123!'
});
const student2Token = student2LoginRes.body.data.tokens.accessToken;
const student2User = student2LoginRes.body.data.user;

await Enrollment.deleteMany({ group: paidReqGroup._id, student: student2User.id || student2User._id });

// C. Paid Request Flow 1: Student submits join request -> pending
const reqJoinRes = await request
  .post('/api/v1/enrollments/request')
  .set('Authorization', `Bearer ${student2Token}`)
  .send({ groupId: String(paidReqGroup._id) });

console.log('Paid request join status:', reqJoinRes.status);
fs.writeFileSync('E:/Elbedawy Academy/docs/samples/enrollments-paid-request-pending.json', JSON.stringify(reqJoinRes.body, null, 2), 'utf8');

const pendingEnrId = reqJoinRes.body.data.enrollment?.id || reqJoinRes.body.data.enrollment?._id || reqJoinRes.body.data.id || reqJoinRes.body.data._id;

// D. Paid Request Flow 2: Teacher lists join requests with ?status=pending
const listPendingRes = await request
  .get(`/api/v1/groups/${paidReqGroup._id}/members?status=pending`)
  .set('Authorization', `Bearer ${teacherToken}`);

console.log('List pending members status:', listPendingRes.status);
fs.writeFileSync('E:/Elbedawy Academy/docs/samples/groups-members-pending.json', JSON.stringify(listPendingRes.body, null, 2), 'utf8');

// E. Paid Request Flow 3: Teacher accepts join request -> awaiting_payment
const acceptRes = await request
  .patch(`/api/v1/enrollments/${pendingEnrId}/status`)
  .set('Authorization', `Bearer ${teacherToken}`)
  .send({ action: 'accept' });

console.log('Accept join request status:', acceptRes.status);
fs.writeFileSync('E:/Elbedawy Academy/docs/samples/enrollments-paid-request-accepted.json', JSON.stringify(acceptRes.body, null, 2), 'utf8');

await mongoose.disconnect();
console.log('All samples generated successfully!');
