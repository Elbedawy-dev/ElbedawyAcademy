import crypto from 'node:crypto';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';
import { uploadStream, deleteAsset } from './cloudinary.service.js';
import { cloudinaryFolders } from '../config/cloudinary.js';
import { privateUser } from '../utils/serializers.js';
import { sha256 } from '../utils/crypto.js';
import { sendTemplateEmail } from '../utils/sendEmail.js';
import env from '../config/env.js';
import { SENSITIVE_USER_FIELDS, AUDIT_ACTIONS } from '../utils/constants.js';

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');
  return privateUser(user);
}

export async function updateMe(userId, updates, actorMeta = {}) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');

  const sensitiveChanges = {};

  if (updates.email && updates.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({
      email: updates.email.toLowerCase(),
      _id: { $ne: userId },
    });
    if (existing) throw AppError.conflict('Email is already in use', undefined, 'EMAIL_EXISTS');

    // Email change requires re-verification
    const token = crypto.randomBytes(32).toString('hex');
    user.pendingEmail = updates.email.toLowerCase();
    user.emailVerificationToken = sha256(token);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}&emailChange=true`;
    sendTemplateEmail(user.pendingEmail, 'verifyEmail', {
      name: user.name,
      url: verifyUrl,
    }).catch(() => {});

    sensitiveChanges.email = { from: user.email, to: user.pendingEmail };
  }

  for (const field of ['name', 'phone', 'gender', 'dateOfBirth', 'address', 'language', 'timezone']) {
    if (updates[field] !== undefined) {
      if (SENSITIVE_USER_FIELDS.includes(field) && String(user[field]) !== String(updates[field])) {
        sensitiveChanges[field] = { from: user[field], to: updates[field] };
      }
      user[field] = updates[field];
    }
  }

  await user.save();

  if (Object.keys(sensitiveChanges).length > 0) {
    await AuditLog.create({
      actor: userId,
      action: AUDIT_ACTIONS.USER_SENSITIVE_UPDATED,
      entity: 'User',
      entityId: userId,
      meta: sensitiveChanges,
      ip: actorMeta.ip,
      userAgent: actorMeta.userAgent,
    });
  }

  return privateUser(user);
}

export async function updateAvatar(userId, fileBuffer) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');

  const uploadResult = await uploadStream(fileBuffer, {
    folder: cloudinaryFolders.avatars,
    resourceType: 'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  // Delete previous avatar from Cloudinary if exists
  if (user.avatar?.publicId) {
    deleteAsset(user.avatar.publicId).catch(() => {});
  }

  user.avatar = {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
  };
  await user.save();

  return privateUser(user);
}

export async function deleteAvatar(userId) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');

  if (user.avatar?.publicId) {
    await deleteAsset(user.avatar.publicId);
  }

  user.avatar = undefined;
  await user.save();

  return privateUser(user);
}

export async function adminListUsers(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { deletedAt: null };
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) {
    const s = String(query.search).trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    data: users.map(privateUser),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function adminGetUserById(id) {
  const user = await User.findById(id);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');
  return privateUser(user);
}

export async function adminUpdateUser(id, updates, adminUser, actorMeta = {}) {
  const user = await User.findById(id);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');

  const sensitiveChanges = {};

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined && user[key] !== val) {
      if (SENSITIVE_USER_FIELDS.includes(key)) {
        sensitiveChanges[key] = { from: user[key], to: val };
      }
      user[key] = val;
    }
  }

  await user.save();

  if (Object.keys(sensitiveChanges).length > 0) {
    await AuditLog.create({
      actor: adminUser._id,
      action: AUDIT_ACTIONS.USER_SENSITIVE_UPDATED,
      entity: 'User',
      entityId: user._id,
      meta: sensitiveChanges,
      ip: actorMeta.ip,
      userAgent: actorMeta.userAgent,
    });
  }

  return privateUser(user);
}

export async function adminToggleActive(id, isActive, adminUser, actorMeta = {}) {
  const user = await User.findById(id);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');

  user.isActive = isActive;
  await user.save();

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
    entity: 'User',
    entityId: user._id,
    meta: { isActive },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  return privateUser(user);
}

export async function adminDeleteUser(id, adminUser, actorMeta = {}) {
  const user = await User.findById(id);
  if (!user || user.deletedAt) throw AppError.notFound('User not found');

  user.deletedAt = new Date();
  user.isActive = false;
  await user.save();

  await AuditLog.create({
    actor: adminUser._id,
    action: AUDIT_ACTIONS.USER_DELETED,
    entity: 'User',
    entityId: user._id,
    meta: { email: user.email, name: user.name },
    ip: actorMeta.ip,
    userAgent: actorMeta.userAgent,
  });

  return { success: true, message: 'User soft-deleted successfully' };
}

export default {
  getMe,
  updateMe,
  updateAvatar,
  deleteAvatar,
  adminListUsers,
  adminGetUserById,
  adminUpdateUser,
  adminToggleActive,
  adminDeleteUser,
};
