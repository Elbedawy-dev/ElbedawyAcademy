import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import { ROLE_VALUES, GENDERS, LANGUAGES, DEFAULT_TIMEZONE } from '../utils/constants.js';
import { ageFromDob } from '../utils/time.js';
import { addressSchema, imageSchema } from './schemas.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    userAgent: { type: String },
    ip: { type: String },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 160,
      // Parent-managed child accounts may have no email
      required() {
        return !this.createdByParent;
      },
    },
    pendingEmail: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLE_VALUES, required: true, index: true },
    gender: { type: String, enum: GENDERS, required: true },
    dateOfBirth: {
      type: Date,
      required() {
        return ['teacher', 'student'].includes(this.role);
      },
    },
    avatar: { type: imageSchema, default: undefined },
    address: { type: addressSchema, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: false },
    fcmTokens: { type: [String], default: [], select: false },
    language: { type: String, enum: LANGUAGES, default: 'ar' },
    timezone: { type: String, default: DEFAULT_TIMEZONE },
    lastLoginAt: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    passwordChangedAt: { type: Date },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    createdByParent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.fcmTokens;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Age is derived, never stored
userSchema.virtual('age').get(function getAge() {
  return ageFromDob(this.dateOfBirth);
});

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
userSchema.index({ name: 'text', email: 'text', phone: 'text' }, { default_language: 'none', language_override: 'none' });
userSchema.index({ role: 1, isActive: 1, deletedAt: 1, createdAt: -1 });
userSchema.index({ 'refreshTokens.tokenHash': 1 });

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, env.BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
};

userSchema.methods.comparePassword = async function comparePassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isMinorFor = function isMinorFor(minAge) {
  const age = ageFromDob(this.dateOfBirth);
  return age !== null && age < minAge;
};

userSchema.statics.findActiveById = function findActiveById(id) {
  return this.findOne({ _id: id, deletedAt: null, isActive: true });
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;

