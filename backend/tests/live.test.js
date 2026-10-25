import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './helpers.js';
import agoraConfig from '../src/config/agora.js';
import TeacherProfile from '../src/models/TeacherProfile.js';
import Room from '../src/models/Room.js';
import Group from '../src/models/Group.js';
import Subject from '../src/models/Subject.js';
import Session from '../src/models/Session.js';
import Enrollment from '../src/models/Enrollment.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Live Video & Agora Token API', () => {
  let teacher, student, session, group;

  beforeEach(async () => {
    teacher = await createTestUser({ role: 'teacher' });
    student = await createTestUser({ role: 'student' });

    await TeacherProfile.create({
      user: teacher.user._id,
      status: 'approved',
    });

    const room = await Room.create({ teacher: teacher.user._id, name: 'Teacher Room' });

    const subject = await Subject.create({
      name: { ar: 'القرآن', en: 'Quran' },
      slug: 'quran',
      type: 'quran',
    });

    group = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'حلقة البقرة',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'boys',
      price: { amount: 300, currency: 'EGP' },
      schedule: [{ dayOfWeek: 0, startTime: '10:00', endTime: '11:00' }],
    });

    await Enrollment.create({
      group: group._id,
      student: student.user._id,
      status: 'active',
      subscription: {
        status: 'active',
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // active subscription
      },
    });

    session = await Session.create({
      group: group._id,
      teacher: teacher.user._id,
      title: 'جلسة التسميع الأسبوعية',
      type: 'quran',
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 3600000),
      status: 'live',
      live: {
        channelName: 'session_test_channel_123',
        startedAt: new Date(),
      },
    });
  });

  it('should throw 503 LIVE_NOT_CONFIGURED when Agora credentials are unconfigured', async () => {
    expect(agoraConfig.isConfigured).toBe(false);

    const res = await request(app)
      .get(`/api/v1/live/sessions/${session._id}/token`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('LIVE_NOT_CONFIGURED');
  });

  it('should throw 503 LIVE_NOT_CONFIGURED when teacher starts live session without Agora configured', async () => {
    const scheduledSession = await Session.create({
      group: group._id,
      teacher: teacher.user._id,
      title: 'جلسة جديدة',
      type: 'quran',
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 3600000),
      status: 'scheduled',
    });

    const res = await request(app)
      .post(`/api/v1/live/sessions/${scheduledSession._id}/start`)
      .set('Authorization', `Bearer ${teacher.token}`);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('LIVE_NOT_CONFIGURED');
  });
});

