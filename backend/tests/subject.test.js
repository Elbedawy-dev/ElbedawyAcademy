import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './helpers.js';
import Subject from '../src/models/Subject.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('GET /api/v1/subjects', () => {
  beforeEach(async () => {
    await Subject.create([
      {
        name: { ar: 'القرآن الكريم', en: 'Holy Quran' },
        slug: 'quran',
        type: 'quran',
        gradeLevels: ['all_ages'],
        order: 1,
        isActive: true,
      },
      {
        name: { ar: 'متن تحفة الأطفال', en: 'Tuhfat Al-Atfal' },
        slug: 'matn-tuhfa',
        type: 'tajweed_matn',
        gradeLevels: ['kids', 'beginner'],
        order: 2,
        isActive: true,
      },
      {
        name: { ar: 'اللغة العربية', en: 'Arabic Language' },
        slug: 'arabic',
        type: 'school',
        gradeLevels: ['primary_1', 'primary_2'],
        order: 3,
        isActive: true,
      },
      {
        name: { ar: 'مادة معطلة', en: 'Inactive Subject' },
        slug: 'inactive',
        type: 'school',
        order: 99,
        isActive: false,
      },
    ]);
  });

  it('should list active subjects publicly without authentication in order', async () => {
    const res = await request(app).get('/api/v1/subjects');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);

    // Verify sort order
    expect(res.body.data[0].slug).toBe('quran');
    expect(res.body.data[1].slug).toBe('matn-tuhfa');
    expect(res.body.data[2].slug).toBe('arabic');

    // Inactive subject must not be returned
    expect(res.body.data.some((s) => s.slug === 'inactive')).toBe(false);

    // Verify fields
    const first = res.body.data[0];
    expect(first.id).toBeDefined();
    expect(first.name.ar).toBe('القرآن الكريم');
    expect(first.name.en).toBe('Holy Quran');
    expect(first.type).toBe('quran');
    expect(Array.isArray(first.gradeLevels)).toBe(true);
  });

  it('should filter subjects by optional type query parameter', async () => {
    const res = await request(app).get('/api/v1/subjects?type=quran');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].slug).toBe('quran');
    expect(res.body.data[0].type).toBe('quran');
  });

  it('should reject invalid type parameter with validation error', async () => {
    const res = await request(app).get('/api/v1/subjects?type=invalid_type');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
