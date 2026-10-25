import mongoose from 'mongoose';
import {
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  CURRENCIES,
} from '../utils/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: 'EGP' },
    platformFee: { type: Number, required: true, min: 0 },
    teacherAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_STATUS, default: 'pending', index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'card' },
    provider: { type: String, enum: PAYMENT_PROVIDERS, default: 'paymob' },
    providerRef: { type: String, trim: true, index: true },
    paymobOrderId: { type: String, trim: true, index: true },
    paymobTransactionId: { type: String, trim: true, index: true },
    needsRefund: { type: Boolean, default: false },
    failedAttempts: { type: Array, default: [] },
    webhookPayload: { type: mongoose.Schema.Types.Mixed },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundReason: { type: String, trim: true, maxlength: 500 },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.webhookPayload;
        return ret;
      },
    },
  },
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ student: 1, createdAt: -1 });
paymentSchema.index({ group: 1, status: 1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;
