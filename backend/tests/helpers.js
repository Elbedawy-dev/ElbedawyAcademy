import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import { signAccessToken } from '../src/utils/generateTokens.js';

let mongoServer = null;

export async function connectTestDB() {
  try {
    const dbName = `elbedawy_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`, { serverSelectionTimeoutMS: 2000 });
    return;
  } catch (e) {
    // Fall back to MongoMemoryServer
  }
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

export async function closeTestDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
    } catch {}
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function createTestUser({
  name = 'Test User',
  email,
  role = 'student',
  gender = 'male',
  dateOfBirth = new Date('2010-01-01'),
  password = 'Password123!',
} = {}) {
  const userEmail = email || `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const passwordHash = await bcrypt.hash(password, 6);
  const user = await User.create({
    name,
    email: userEmail,
    phone: `010${Math.floor(10000000 + Math.random() * 90000000)}`,
    passwordHash,
    role,
    gender,
    dateOfBirth,
    address: { country: 'Egypt', city: 'Cairo' },
    isActive: true,
    isEmailVerified: true,
  });

  const token = signAccessToken(user);
  return { user, token };
}
