import mongoose from 'mongoose';
import { PAYOUT_STATUS, CURRENCIES } from '../utils/constants.js';

const payoutSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      index: true,
    },
    grossAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: 'EGP' },
    status: { type: String, enum: PAYOUT_STATUS, default: 'pending', index: true },
    paidAt: { type: Date },
    reference: { type: String, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 1000 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

payoutSchema.index({ teacher: 1, period: 1 }, { unique: true });

const Payout = mongoose.models.Payout || mongoose.model('Payout', payoutSchema);
export default Payout;
