import mongoose from 'mongoose';
import {
  GROUP_GENDER_TYPES,
  GROUP_STATUS,
  JOIN_MODES,
  BILLING_CYCLES,
  CURRENCIES,
  GROUP_LEVELS,
  DAYS_OF_WEEK,
  DEFAULT_TIMEZONE,
} from '../utils/constants.js';

const scheduleSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, enum: DAYS_OF_WEEK, required: true },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    timezone: { type: String, default: DEFAULT_TIMEZONE },
  },
  { _id: false },
);

const priceSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: 'EGP' },
    billingCycle: { type: String, enum: BILLING_CYCLES, default: 'monthly' },
  },
  { _id: false },
);

const groupSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    gradeLevel: { type: String, enum: GROUP_LEVELS, required: true, index: true },
    genderType: { type: String, enum: GROUP_GENDER_TYPES, required: true, index: true },
    maxStudents: { type: Number, required: true, min: 1, max: 100, default: 15 },
    price: { type: priceSchema, required: true },
    schedule: { type: [scheduleSlotSchema], default: [] },
    status: { type: String, enum: GROUP_STATUS, default: 'open', index: true },
    joinMode: { type: String, enum: JOIN_MODES, default: 'request', index: true },
    joinCode: { type: String, unique: true, sparse: true },
    activeMembersCount: { type: Number, default: 0, min: 0 },
    mutedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        // keep _id for compatibility
        delete ret.__v;
        return ret;
      },
    },
  },
);

groupSchema.index({ teacher: 1, deletedAt: 1 });
groupSchema.index({ subject: 1, gradeLevel: 1, genderType: 1, status: 1 });

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
export default Group;

