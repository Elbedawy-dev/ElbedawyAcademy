import mongoose from 'mongoose';
import { ENROLLMENT_STATUS, SUBSCRIPTION_STATUS } from '../utils/constants.js';

const subscriptionSchema = new mongoose.Schema(
  {
    status: { type: String, enum: SUBSCRIPTION_STATUS, default: 'none' },
    startDate: { type: Date },
    endDate: { type: Date },
    graceUntil: { type: Date },
    autoRenew: { type: Boolean, default: false },
    lastPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  },
  { _id: false },
);

const enrollmentSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrolledByParent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ENROLLMENT_STATUS, default: 'pending', index: true },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    joinedAt: { type: Date },
    pausedAt: { type: Date },
    cancelledAt: { type: Date },
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

enrollmentSchema.index({ group: 1, student: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ group: 1, status: 1 });

const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;
