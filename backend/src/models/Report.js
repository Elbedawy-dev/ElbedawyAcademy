import mongoose from 'mongoose';
import { REPORT_TARGETS, REPORT_STATUS } from '../utils/constants.js';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUS, default: 'open', index: true },
    resolutionNotes: { type: String, trim: true, maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
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

reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;
