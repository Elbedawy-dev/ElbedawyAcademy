import { ageFromDob } from './time.js';

/**
 * Privacy-aware projections. Never expose address/dateOfBirth to other students,
 * and never leak tokens/hashes anywhere.
 */

const idOf = (doc) => (doc?._id ? String(doc._id) : doc?.id ? String(doc.id) : null);

/** Minimal identity used in chat, member lists for students, reviews... */
export function publicUser(user) {
  if (!user) return null;
  return {
    id: idOf(user),
    name: user.name,
    avatar: user.avatar?.url || null,
    gender: user.gender,
    role: user.role,
  };
}

/** What a teacher sees about a student enrolled in one of their groups. */
export function studentForTeacher(user, studentProfile) {
  if (!user) return null;
  return {
    ...publicUser(user),
    email: user.email || null,
    phone: user.phone || null,
    age: ageFromDob(user.dateOfBirth),
    dateOfBirth: user.dateOfBirth || null,
    address: user.address
      ? { country: user.address.country, governorate: user.address.governorate, city: user.address.city }
      : null,
    timezone: user.timezone,
    grade: studentProfile?.grade,
    schoolName: studentProfile?.schoolName,
    quranLevel: studentProfile?.quranLevel,
  };
}

/** Full private view for the owner, linked parent or admin. */
export function privateUser(user) {
  if (!user) return null;
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete plain.passwordHash;
  delete plain.refreshTokens;
  delete plain.fcmTokens;
  delete plain.emailVerificationToken;
  delete plain.emailVerificationExpires;
  delete plain.passwordResetToken;
  delete plain.passwordResetExpires;
  delete plain.__v;
  plain.id = idOf(user);
  delete plain._id;
  if (plain.age === undefined) plain.age = ageFromDob(plain.dateOfBirth);
  return plain;
}

/** Public teacher catalogue card: name, avatar, bio, specialties, rating, country/city only. */
export function teacherPublic(user, profile, extra = {}) {
  if (!user) return null;
  return {
    id: idOf(user),
    name: user.name,
    avatar: user.avatar?.url || null,
    gender: user.gender,
    country: user.address?.country || null,
    city: user.address?.city || null,
    bio: profile?.bio || '',
    specialties: profile?.specialties || [],
    subjects: (profile?.subjects || []).map((s) =>
      s && s.name ? { id: idOf(s), name: s.name, type: s.type } : String(s),
    ),
    yearsOfExperience: profile?.yearsOfExperience || 0,
    ratingAvg: profile?.ratingAvg || 0,
    ratingCount: profile?.ratingCount || 0,
    ...extra,
  };
}
