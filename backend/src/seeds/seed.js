import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import env from '../config/env.js';
import User from '../models/User.js';
import TeacherProfile from '../models/TeacherProfile.js';
import StudentProfile from '../models/StudentProfile.js';
import ParentProfile from '../models/ParentProfile.js';
import ParentLink from '../models/ParentLink.js';
import Subject from '../models/Subject.js';
import Room from '../models/Room.js';
import Group from '../models/Group.js';
import Enrollment from '../models/Enrollment.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import QuranProgress from '../models/QuranProgress.js';
import QuranSummary from '../models/QuranSummary.js';
import Settings from '../models/Settings.js';

dotenv.config();

const DEFAULT_PASSWORD = 'Password123!';

async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to MongoDB');

  const isFresh = process.argv.includes('--fresh');
  if (isFresh) {
    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      TeacherProfile.deleteMany({}),
      StudentProfile.deleteMany({}),
      ParentProfile.deleteMany({}),
      ParentLink.deleteMany({}),
      Subject.deleteMany({}),
      Room.deleteMany({}),
      Group.deleteMany({}),
      Enrollment.deleteMany({}),
      Session.deleteMany({}),
      Attendance.deleteMany({}),
      QuranProgress.deleteMany({}),
      QuranSummary.deleteMany({}),
      Settings.deleteMany({}),
    ]);
    console.log('Collections cleared');
  }

  // 1. Settings
  console.log('Seeding settings...');
  await Settings.findOneAndUpdate(
    {},
    {
      platformCommissionPercent: 15,
      allowMixedGroups: true,
      enforceGenderMatch: false,
      minAgeForOwnAccount: 13,
      subscriptionGraceDays: 3,
      minSessionsBeforeReview: 2,
    },
    { upsert: true, new: true },
  );

  // 2. Subjects
  console.log('Seeding subjects...');
  const quranSubject = await Subject.findOneAndUpdate(
    { slug: 'quran-hifz' },
    {
      name: { ar: 'تحفيظ القرآن الكريم', en: 'Quran Memorization' },
      slug: 'quran-hifz',
      type: 'quran',
      gradeLevels: ['all_ages', 'kids', 'adults', 'beginner', 'intermediate', 'advanced'],
      isActive: true,
    },
    { upsert: true, new: true },
  );

  const tajweedSubject = await Subject.findOneAndUpdate(
    { slug: 'tajweed-mutun' },
    {
      name: { ar: 'متون التجويد (تحفة الأطفال والجزرية)', en: 'Tajweed Texts' },
      slug: 'tajweed-mutun',
      type: 'tajweed_matn',
      gradeLevels: ['beginner', 'intermediate', 'advanced'],
      isActive: true,
    },
    { upsert: true, new: true },
  );

  const arabicSubject = await Subject.findOneAndUpdate(
    { slug: 'arabic-primary' },
    {
      name: { ar: 'اللغة العربية', en: 'Arabic Language' },
      slug: 'arabic-primary',
      type: 'school',
      gradeLevels: ['primary_4', 'primary_5', 'primary_6'],
      isActive: true,
    },
    { upsert: true, new: true },
  );

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 3. Admin
  console.log('Seeding Admin...');
  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@elbedawy-academy.com' },
    {
      name: 'مدير الأكاديمية (Admin)',
      email: 'admin@elbedawy-academy.com',
      phone: '01000000001',
      passwordHash,
      role: 'admin',
      gender: 'male',
      dateOfBirth: new Date('1985-01-01'),
      address: { country: 'Egypt', city: 'Cairo', governorate: 'Cairo' },
      isActive: true,
      isEmailVerified: true,
    },
    { upsert: true, new: true },
  );

  // 4. Three Approved Teachers
  console.log('Seeding 3 Approved Teachers...');
  const teachersData = [
    {
      name: 'الشيخ أحمد البديوي',
      email: 'ahmed.elbedawy@academy.com',
      phone: '01011111111',
      gender: 'male',
      bio: 'مجاز بالقراءات العشر الصغرى والكبرى، خبرة ١٥ عامًا في تحفيظ القرآن وإقراء المتون.',
      specialties: ['quran', 'tajweed'],
      subjects: [quranSubject._id, tajweedSubject._id],
    },
    {
      name: 'الشيخة فاطمة الزهراء',
      email: 'fatima.zahra@academy.com',
      phone: '01022222222',
      gender: 'female',
      bio: 'مجازة برواية حفص عن عاصم، متخصصة في تحفيظ الفتيات والأطفال وتدريس متني التحفة والجزرية.',
      specialties: ['quran', 'tajweed'],
      subjects: [quranSubject._id, tajweedSubject._id],
    },
    {
      name: 'الأستاذ محمود إبراهيم',
      email: 'mahmoud.ibrahim@academy.com',
      phone: '01033333333',
      gender: 'male',
      bio: 'معلم لغة عربية وتربية إسلامية للمرحلة الابتدائية والإعدادية بالمنهج المصري.',
      specialties: ['school'],
      subjects: [arabicSubject._id],
    },
  ];

  const teachers = [];
  for (const t of teachersData) {
    const user = await User.findOneAndUpdate(
      { email: t.email },
      {
        name: t.name,
        email: t.email,
        phone: t.phone,
        passwordHash,
        role: 'teacher',
        gender: t.gender,
        dateOfBirth: new Date('1988-06-15'),
        address: { country: 'Egypt', city: 'Giza', governorate: 'Giza' },
        isActive: true,
        isEmailVerified: true,
      },
      { upsert: true, new: true },
    );

    const profile = await TeacherProfile.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        bio: t.bio,
        specialties: t.specialties,
        subjects: t.subjects,
        yearsOfExperience: 10,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: adminUser._id,
        ratingAvg: 4.9,
        ratingCount: 18,
        certificates: [
          {
            title: 'إجازة في القرآن الكريم بالسند المتصل',
            issuer: 'مشيخة المقارئ المصرية',
            type: 'ijazah',
            fileUrl: 'https://fake-cdn.elbedawy-academy.com/private/ijazah_1',
            publicId: 'fake_ijazah_1',
            verificationStatus: 'verified',
            uploadedAt: new Date(),
          },
        ],
      },
      { upsert: true, new: true },
    );

    const room = await Room.findOneAndUpdate(
      { teacher: user._id },
      {
        teacher: user._id,
        name: `غرفة ${t.name}`,
        description: t.bio,
        isActive: true,
      },
      { upsert: true, new: true },
    );

    teachers.push({ user, profile, room });
  }

  // 5. Parents (2 Parents)
  console.log('Seeding 2 Parents...');
  const parent1 = await User.findOneAndUpdate(
    { email: 'parent1@elbedawy-academy.com' },
    {
      name: 'عبد الرحمن القاضي (ولي أمر)',
      email: 'parent1@elbedawy-academy.com',
      phone: '01044444441',
      passwordHash,
      role: 'parent',
      gender: 'male',
      address: { country: 'Egypt', city: 'Alexandria', governorate: 'Alexandria' },
      isActive: true,
      isEmailVerified: true,
    },
    { upsert: true, new: true },
  );

  const parent2 = await User.findOneAndUpdate(
    { email: 'parent2@elbedawy-academy.com' },
    {
      name: 'مريم السيد (ولية أمر)',
      email: 'parent2@elbedawy-academy.com',
      phone: '01044444442',
      passwordHash,
      role: 'parent',
      gender: 'female',
      address: { country: 'Egypt', city: 'Cairo', governorate: 'Cairo' },
      isActive: true,
      isEmailVerified: true,
    },
    { upsert: true, new: true },
  );

  // 6. Ten Students (5 boys, 5 girls)
  console.log('Seeding 10 Students...');
  const students = [];
  for (let i = 1; i <= 10; i += 1) {
    const isGirl = i > 5;
    const name = isGirl ? `طالبة مجتهدة ${i}` : `طالب مجتهد ${i}`;
    const email = `student${i}@elbedawy-academy.com`;
    const gender = isGirl ? 'female' : 'male';
    const assignedParent = i <= 3 ? parent1._id : i <= 6 ? parent2._id : undefined;

    const studentUser = await User.findOneAndUpdate(
      { email },
      {
        name,
        email,
        phone: `010555555${i < 10 ? `0${i}` : i}`,
        passwordHash,
        role: 'student',
        gender,
        dateOfBirth: new Date(`2012-0${(i % 9) + 1}-10`),
        address: { country: 'Egypt', city: 'Cairo', governorate: 'Cairo' },
        isActive: true,
        isEmailVerified: true,
      },
      { upsert: true, new: true },
    );

    const sp = await StudentProfile.findOneAndUpdate(
      { user: studentUser._id },
      {
        user: studentUser._id,
        grade: 'primary_5',
        schoolName: 'مدرسة النور الخاصة',
        quranLevel: 'intermediate',
        parents: assignedParent ? [assignedParent] : [],
      },
      { upsert: true, new: true },
    );

    if (assignedParent) {
      await ParentLink.findOneAndUpdate(
        { parent: assignedParent, student: studentUser._id },
        {
          parent: assignedParent,
          student: studentUser._id,
          status: 'accepted',
          method: 'invitation',
          acceptedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      await ParentProfile.findOneAndUpdate(
        { user: assignedParent },
        { $addToSet: { children: sp._id } },
        { upsert: true },
      );
    }

    students.push(studentUser);
  }

  // 7. Groups
  console.log('Seeding sample learning Groups...');
  const group1 = await Group.findOneAndUpdate(
    { name: 'حلقة البنين - المستوى المتوسط' },
    {
      room: teachers[0].room._id,
      teacher: teachers[0].user._id,
      name: 'حلقة البنين - المستوى المتوسط',
      subject: quranSubject._id,
      gradeLevel: 'intermediate',
      genderType: 'boys',
      maxStudents: 10,
      price: { amount: 350, currency: 'EGP', billingCycle: 'monthly' },
      schedule: [
        { dayOfWeek: 0, startTime: '16:00', endTime: '17:30', timezone: 'Africa/Cairo' },
        { dayOfWeek: 4, startTime: '16:00', endTime: '17:30', timezone: 'Africa/Cairo' },
      ],
      status: 'open',
      joinMode: 'open',
      joinCode: 'QURANBOY',
      activeMembersCount: 4,
    },
    { upsert: true, new: true },
  );

  const group2 = await Group.findOneAndUpdate(
    { name: 'حلقة الفتيات - القرآن والتجويد' },
    {
      room: teachers[1].room._id,
      teacher: teachers[1].user._id,
      name: 'حلقة الفتيات - القرآن والتجويد',
      subject: quranSubject._id,
      gradeLevel: 'intermediate',
      genderType: 'girls',
      maxStudents: 10,
      price: { amount: 400, currency: 'EGP', billingCycle: 'monthly' },
      schedule: [
        { dayOfWeek: 0, startTime: '18:00', endTime: '19:30', timezone: 'Africa/Cairo' },
        { dayOfWeek: 4, startTime: '18:00', endTime: '19:30', timezone: 'Africa/Cairo' },
      ],
      status: 'open',
      joinMode: 'open',
      joinCode: 'QURANGIRL',
      activeMembersCount: 4,
    },
    { upsert: true, new: true },
  );

  // 8. Enrollments
  console.log('Enrolling students in sample groups...');
  for (let i = 0; i < 4; i += 1) {
    // Boys into group1
    await Enrollment.findOneAndUpdate(
      { group: group1._id, student: students[i]._id },
      {
        group: group1._id,
        student: students[i]._id,
        status: 'active',
        joinedAt: new Date(),
        subscription: {
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true, new: true },
    );

    // Girls into group2
    await Enrollment.findOneAndUpdate(
      { group: group2._id, student: students[5 + i]._id },
      {
        group: group2._id,
        student: students[5 + i]._id,
        status: 'active',
        joinedAt: new Date(),
        subscription: {
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true, new: true },
    );
  }

  // 9. Sample Sessions
  console.log('Seeding Sessions and Attendance...');
  const now = new Date();
  const session1 = await Session.findOneAndUpdate(
    { title: 'حصة التسميع والمراجعة - حلقة البنين' },
    {
      group: group1._id,
      teacher: teachers[0].user._id,
      title: 'حصة التسميع والمراجعة - حلقة البنين',
      type: 'quran',
      scheduledStart: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      scheduledEnd: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      status: 'ended',
      notes: 'تمت مراجعة سورة النبأ وبداية حفظ سورة النازعات.',
    },
    { upsert: true, new: true },
  );

  for (let i = 0; i < 4; i += 1) {
    await Attendance.findOneAndUpdate(
      { session: session1._id, student: students[i]._id },
      {
        session: session1._id,
        student: students[i]._id,
        status: i === 3 ? 'late' : 'present',
        joinedAt: new Date(session1.scheduledStart),
        durationMinutes: 75,
      },
      { upsert: true, new: true },
    );
  }

  // 10. Sample Quran Progress Entries
  console.log('Seeding Quran Progress entries & aggregates...');
  for (let i = 0; i < 4; i += 1) {
    await QuranProgress.create({
      student: students[i]._id,
      teacher: teachers[0].user._id,
      group: group1._id,
      session: session1._id,
      date: new Date(),
      entryType: 'new_memorization',
      surah: 78, // An-Naba
      fromAyah: 1,
      toAyah: 20,
      pageFrom: 582,
      pageTo: 582,
      juz: 30,
      rating: 'excellent',
      mistakes: { hifz: 0, tajweed: 1, notes: 'انتباه لأحكام الإدغام بغنة' },
      tafsirCovered: {
        covered: true,
        notes: 'بيان معاني المفردات: النبأ العظيم، مهادا، أوتادا.',
      },
      teacherNote: 'ممتاز ما شاء الله، استمر على هذا الأداء.',
    });

    await QuranSummary.findOneAndUpdate(
      { student: students[i]._id },
      {
        student: students[i]._id,
        totalPagesMemorized: 20,
        memorizedPagesList: [582, 583, 584, 585],
        juzCompleted: [30],
        currentPosition: { surah: 78, ayah: 20, page: 582, juz: 30 },
        percentageMemorized: 3.31,
        lastReviewDateByJuz: [{ juz: 30, lastReviewedAt: new Date() }],
      },
      { upsert: true, new: true },
    );
  }

  console.log('----------------------------------------------------');
  console.log('Seeding completed successfully!');
  console.log('Test Accounts created (Password for all: Password123!):');
  console.log('Admin:   admin@elbedawy-academy.com');
  console.log('Teacher: ahmed.elbedawy@academy.com (Sheikh Ahmed)');
  console.log('Teacher: fatima.zahra@academy.com (Sheikha Fatima)');
  console.log('Teacher: mahmoud.ibrahim@academy.com (Mr. Mahmoud)');
  console.log('Parent:  parent1@elbedawy-academy.com (has linked children)');
  console.log('Student: student1@elbedawy-academy.com (enrolled in boys group)');
  console.log('Student: student6@elbedawy-academy.com (enrolled in girls group)');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
