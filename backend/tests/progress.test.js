import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB, createTestUser } from './helpers.js';
import TeacherProfile from '../src/models/TeacherProfile.js';
import QuranSummary from '../src/models/QuranSummary.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Quran Progress and Aggregations', () => {
  let teacher, student;

  beforeEach(async () => {
    teacher = await createTestUser({ role: 'teacher' });
    student = await createTestUser({ role: 'student' });

    await TeacherProfile.create({
      user: teacher.user._id,
      status: 'approved',
    });
  });

  it('should record new memorization and aggregate QuranSummary', async () => {
    const res = await request(app)
      .post('/api/v1/progress/quran')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        student: student.user._id,
        entryType: 'new_memorization',
        surah: 1, // Al-Fatihah
        fromAyah: 1,
        toAyah: 7,
        pageFrom: 1,
        pageTo: 1,
        juz: 1,
        rating: 'excellent',
        tafsirCovered: {
          covered: true,
          notes: 'تفسير سورة الفاتحة كاملاً',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const summary = await QuranSummary.findOne({ student: student.user._id });
    expect(summary).toBeDefined();
    expect(summary.totalPagesMemorized).toBe(1);
    expect(summary.percentageMemorized).toBeGreaterThan(0);
    expect(summary.currentPosition.surah).toBe(1);
  });

  it('should allow student to query their own timeline', async () => {
    // Record one entry first
    await request(app)
      .post('/api/v1/progress/quran')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        student: student.user._id,
        entryType: 'new_memorization',
        surah: 114,
        fromAyah: 1,
        toAyah: 6,
        pageFrom: 604,
        pageTo: 604,
        juz: 30,
        rating: 'good',
      });

    const res = await request(app)
      .get(`/api/v1/progress/quran/student/${student.user._id}`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].surah).toBe(114);
  });

  it('should reject POST /progress/quran if toAyah or fromAyah exceeds surah ayah count', async () => {
    // Surah 1 (Al-Fatihah) has only 7 ayahs. Sending toAyah: 8 must be rejected.
    const res = await request(app)
      .post('/api/v1/progress/quran')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        student: student.user._id,
        entryType: 'new_memorization',
        surah: 1, // Al-Fatihah has 7 ayahs
        fromAyah: 1,
        toAyah: 8, // Invalid!
        pageFrom: 1,
        pageTo: 1,
        juz: 1,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should reject PATCH /progress/quran/:id if updated ayah exceeds surah ayah count', async () => {
    // First create a valid entry for Surah 114 (An-Nas, 6 ayahs)
    const createRes = await request(app)
      .post('/api/v1/progress/quran')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        student: student.user._id,
        entryType: 'new_memorization',
        surah: 114,
        fromAyah: 1,
        toAyah: 6,
        pageFrom: 604,
        pageTo: 604,
        juz: 30,
        rating: 'good',
      });

    const entryId = createRes.body.data.id || createRes.body.data._id;

    // Now try to PATCH toAyah: 7 (An-Nas only has 6 ayahs)
    const patchRes = await request(app)
      .patch(`/api/v1/progress/quran/${entryId}`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        toAyah: 7, // Invalid for Surah 114
      });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.success).toBe(false);
  });
});
