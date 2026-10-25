import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './helpers.js';
import Subject from '../src/models/Subject.js';
import Room from '../src/models/Room.js';
import Group from '../src/models/Group.js';
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

describe('Group Visibility and Isolation Security', () => {
  let teacher, studentA, studentB, subject, group1, group2;

  beforeEach(async () => {
    teacher = await createTestUser({
      name: 'الشيخ المعلم',
      email: 'teacher@example.com',
      role: 'teacher',
    });
    studentA = await createTestUser({
      name: 'طالب أ',
      email: 'student.a@example.com',
      role: 'student',
    });
    studentB = await createTestUser({
      name: 'طالب ب',
      email: 'student.b@example.com',
      role: 'student',
    });

    subject = await Subject.create({
      name: { ar: 'القرآن الكريم', en: 'Quran' },
      slug: 'quran-test',
      type: 'quran',
    });

    const room = await Room.create({
      teacher: teacher.user._id,
      name: 'غرفة الشيخ',
    });

    // Group 1: Student A is enrolled
    group1 = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'حلقة البقرة',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'boys',
      maxStudents: 10,
      price: { amount: 300, currency: 'EGP', billingCycle: 'monthly' },
      schedule: [{ dayOfWeek: 0, startTime: '16:00', endTime: '17:00' }],
      status: 'open',
    });

    // Group 2: Student A is NOT enrolled
    group2 = await Group.create({
      room: room._id,
      teacher: teacher.user._id,
      name: 'حلقة آل عمران (سرية بالنسبة لأ)',
      subject: subject._id,
      gradeLevel: 'intermediate',
      genderType: 'boys',
      maxStudents: 10,
      price: { amount: 300, currency: 'EGP', billingCycle: 'monthly' },
      schedule: [{ dayOfWeek: 1, startTime: '16:00', endTime: '17:00' }],
      status: 'open',
    });

    // Enroll Student A in group1 only
    await Enrollment.create({
      group: group1._id,
      student: studentA.user._id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Enroll Student B in group2 only
    await Enrollment.create({
      group: group2._id,
      student: studentB.user._id,
      status: 'active',
      joinedAt: new Date(),
    });
  });

  it('student should only list groups they are actively enrolled in', async () => {
    const res = await request(app)
      .get('/api/v1/groups')
      .set('Authorization', `Bearer ${studentA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id).toBe(String(group1._id));
    expect(res.body.data[0].name).toBe('حلقة البقرة');
  });

  it('student querying a non-enrolled group directly must receive 404 (not 403) to prevent discovery', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${group2._id}`)
      .set('Authorization', `Bearer ${studentA.token}`);

    // Must return 404 to avoid leaking existence
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });

  it('student attempting to query members of a non-enrolled group must receive 404', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${group2._id}/members`)
      .set('Authorization', `Bearer ${studentA.token}`);

    expect(res.status).toBe(404);
  });

  it('fellow group members list should not expose private addresses, DOB, or phone numbers', async () => {
    const res = await request(app)
      .get(`/api/v1/groups/${group1._id}/members`)
      .set('Authorization', `Bearer ${studentA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    const member = res.body.data[0].student;
    expect(member.name).toBe('طالب أ');
    expect(member.address).toBeUndefined();
    expect(member.dateOfBirth).toBeUndefined();
    expect(member.phone).toBeUndefined();
  });
});
