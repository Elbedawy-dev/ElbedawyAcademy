import mongoose from 'mongoose';
import { SUBJECT_TYPES, GROUP_LEVELS } from '../utils/constants.js';

const subjectSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true, maxlength: 100 },
      en: { type: String, required: true, trim: true, maxlength: 100 },
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: SUBJECT_TYPES, required: true, index: true },
    gradeLevels: { type: [{ type: String, enum: GROUP_LEVELS }], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
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

subjectSchema.index({ type: 1, isActive: 1, order: 1 });

const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export default Subject;
