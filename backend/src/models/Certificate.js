import mongoose from 'mongoose';
import { CERTIFICATE_TYPES } from '../utils/constants.js';

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: CERTIFICATE_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: {
      juzNumber: { type: Number, min: 1, max: 30 },
      surahNumber: { type: Number, min: 1, max: 114 },
      courseName: { type: String, trim: true },
      grade: { type: String, trim: true },
    },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    revokedReason: { type: String, trim: true },
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

certificateSchema.index({ student: 1, type: 1 });

const Certificate =
  mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
export default Certificate;
