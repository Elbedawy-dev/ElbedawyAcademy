import mongoose from 'mongoose';
import { SESSION_TYPES, SESSION_STATUS } from '../utils/constants.js';

const liveSchema = new mongoose.Schema(
  {
    channelName: { type: String, trim: true },
    token: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date },
    recordingUrl: { type: String },
    activeAttendeesCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const sessionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    type: { type: String, enum: SESSION_TYPES, required: true, index: true },
    scheduledStart: { type: Date, required: true, index: true },
    scheduledEnd: { type: Date, required: true, index: true },
    status: { type: String, enum: SESSION_STATUS, default: 'scheduled', index: true },
    live: { type: liveSchema, default: () => ({}) },
    notes: { type: String, trim: true, maxlength: 2000 },
    isRecurringInstance: { type: Boolean, default: false },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

sessionSchema.index({ teacher: 1, scheduledStart: 1, scheduledEnd: 1 });
sessionSchema.index({ group: 1, scheduledStart: 1 });
sessionSchema.index({ status: 1, scheduledStart: 1 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export default Session;
