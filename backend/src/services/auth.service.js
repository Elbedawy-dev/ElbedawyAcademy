import crypto from 'node:crypto';
import User from '../models/User.js';
import TeacherProfile from '../models/TeacherProfile.js';
import StudentProfile from '../models/StudentProfile.js';
import ParentProfile from '../models/ParentProfile.js';
import AppError from '../utils/AppError.js';
import { generateAuthTokens, verifyRefreshToken } from '../utils/generateTokens.js';
import { sha256, randomCode } from '../utils/crypto.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';
import env from '../config/env.js';
import { runInTransaction } from '../utils/transaction.js';
import { privateUser } from '../utils/serializers.js';

export async function register(data, meta = {}) {
  const existingUser = await User.findOne({
    $or: [{ email: data.email.toLowerCase() }, { phone: data.phone }],
  });

  if (existingUser) {
    if (existingUser.email === data.email.toLowerCase()) {
      throw AppError.conflict('Email address is already in use', undefined, 'EMAIL_EXISTS');
    }
    throw AppError.conflict('Phone number is already in use', undefined, 'PHONE_EXISTS');
  }

  const emailToken = crypto.randomBytes(32).toString('hex');
  const emailTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  let result;
  await runInTransaction(async (session) => {
    const user = new User({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      role: data.role,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      language: data.language || 'ar',
      timezone: data.timezone || 'Africa/Cairo',
      emailVerificationToken: sha256(emailToken),
      emailVerificationExpires: emailTokenExpires,
    });

    await user.setPassword(data.password);
    await user.save({ session });

    // Role-specific profile initialization
    if (user.role === 'teacher') {
      await TeacherProfile.create(
        [
          {
            user: user._id,
            status: 'pending',
            submittedAt: new Date(),
          },
        ],
        { session },
      );
    } else if (user.role === 'student') {
      await StudentProfile.create(
        [
          {
            user: user._id,
            grade: 'none',
            linkCode: randomCode(8),
            linkCodeExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
        { session },
      );
    } else if (user.role === 'parent') {
      await ParentProfile.create([{ user: user._id, children: [] }], { session });
    }

    const tokens = generateAuthTokens(user);
    user.refreshTokens.push({
      tokenHash: tokens.refreshRecord.tokenHash,
      expiresAt: tokens.refreshRecord.expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    user.lastLoginAt = new Date();
    await user.save({ session });

    result = { user, tokens, emailToken };
  });

  // Send verification email in background
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${result.emailToken}`;
  sendTemplateEmail(result.user.email, 'verifyEmail', {
    name: result.user.name,
    url: verifyUrl,
  }).catch(() => {});

  return {
    user: privateUser(result.user),
    tokens: {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.accessTokenExpiresIn,
    },
  };
}

export async function login({ email, phone, password, fcmToken }, meta = {}) {
  const query = {};
  if (email) query.email = email.toLowerCase();
  else if (phone) query.phone = phone;

  const user = await User.findOne(query).select(
    '+passwordHash +isActive +deletedAt +refreshTokens +fcmTokens',
  );

  if (!user || user.deletedAt) {
    throw AppError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw AppError.forbidden('Your account has been deactivated', 'ACCOUNT_INACTIVE');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
  }

  const tokens = generateAuthTokens(user);

  // Clean up expired refresh tokens and push new one
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.expiresAt > new Date());
  user.refreshTokens.push({
    tokenHash: tokens.refreshRecord.tokenHash,
    expiresAt: tokens.refreshRecord.expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: privateUser(user),
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.accessTokenExpiresIn,
    },
  };
}

export async function refresh(tokenString, meta = {}) {
  let payload;
  try {
    payload = verifyRefreshToken(tokenString);
  } catch {
    throw AppError.unauthorized('Refresh token is invalid or expired', 'TOKEN_INVALID');
  }

  const tokenHash = sha256(tokenString);
  const user = await User.findOne({
    _id: payload.sub,
    deletedAt: null,
    isActive: true,
  }).select('+refreshTokens');

  if (!user) {
    throw AppError.unauthorized('User not found or inactive', 'USER_NOT_FOUND');
  }

  const tokenIndex = user.refreshTokens.findIndex((rt) => rt.tokenHash === tokenHash);
  if (tokenIndex === -1) {
    // Possible token reuse attack detected: invalidate all sessions for safety
    user.refreshTokens = [];
    await user.save();
    throw AppError.unauthorized('Invalid refresh token. Sessions revoked.', 'TOKEN_REUSE');
  }

  // Rotate refresh token
  const tokens = generateAuthTokens(user);
  user.refreshTokens.splice(tokenIndex, 1);
  user.refreshTokens.push({
    tokenHash: tokens.refreshRecord.tokenHash,
    expiresAt: tokens.refreshRecord.expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  await user.save();

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.accessTokenExpiresIn,
  };
}

export async function logout(userId, tokenString) {
  if (!tokenString) return;
  const tokenHash = sha256(tokenString);
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { tokenHash } },
  });
}

export async function logoutAll(userId) {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] },
  });
}

export async function verifyEmail(tokenString) {
  const tokenHash = sha256(tokenString);
  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw AppError.badRequest('Verification link is invalid or expired', undefined, 'TOKEN_INVALID');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return { success: true, message: 'Email successfully verified' };
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) {
    // Return success to avoid email enumeration
    return { success: true, message: 'If an account exists, a reset link was sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = sha256(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  sendTemplateEmail(user.email, 'resetPassword', {
    name: user.name,
    url: resetUrl,
  }).catch(() => {});

  return { success: true, message: 'If an account exists, a reset link was sent' };
}

export async function resetPassword(tokenString, newPassword) {
  const tokenHash = sha256(tokenString);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw AppError.badRequest('Password reset token is invalid or expired', undefined, 'TOKEN_INVALID');
  }

  await user.setPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Revoke sessions on password reset
  await user.save();

  return { success: true, message: 'Password reset successfully' };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash +refreshTokens');
  if (!user) throw AppError.notFound('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw AppError.badRequest('Current password does not match', undefined, 'INVALID_PASSWORD');
  }

  await user.setPassword(newPassword);
  user.refreshTokens = [];
  await user.save();

  return { success: true, message: 'Password changed successfully' };
}

export async function updateFcmToken(userId, fcmToken) {
  await User.findByIdAndUpdate(userId, {
    $addToSet: { fcmTokens: fcmToken },
  });
  return { success: true };
}

export default {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  updateFcmToken,
};
