import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, closeTestDB, clearTestDB } from './helpers.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new student successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'طالب جديد',
          email: 'student.new@example.com',
          phone: '01012345678',
          password: 'Password123!',
          role: 'student',
          gender: 'male',
          dateOfBirth: '2012-05-10',
          address: { country: 'Egypt', city: 'Cairo' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('student.new@example.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject teacher registration if under 18 years old', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'معلم صغير',
          email: 'young.teacher@example.com',
          phone: '01012345679',
          password: 'Password123!',
          role: 'teacher',
          gender: 'male',
          dateOfBirth: '2012-05-10', // 12 years old
          address: { country: 'Egypt', city: 'Giza' },
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error)).toContain('18 years old');
    });

    it('should reject registration with duplicate email', async () => {
      const payload = {
        name: 'طالب مكرر',
        email: 'duplicate@example.com',
        phone: '01012345680',
        password: 'Password123!',
        role: 'student',
        gender: 'male',
        dateOfBirth: '2010-01-01',
        address: { country: 'Egypt', city: 'Alexandria' },
      };

      await request(app).post('/api/v1/auth/register').send(payload);
      const res = await request(app).post('/api/v1/auth/register').send({
        ...payload,
        phone: '01012345681',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'مستخدم تسجيل دخول',
          email: 'login.user@example.com',
          phone: '01099999999',
          password: 'Password123!',
          role: 'student',
          gender: 'female',
          dateOfBirth: '2011-03-15',
          address: { country: 'Egypt', city: 'Cairo' },
        });
    });

    it('should login successfully with valid email and password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login.user@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login.user@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
