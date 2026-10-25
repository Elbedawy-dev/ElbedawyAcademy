import mongoose from 'mongoose';
import { ASSIGNMENT_TYPES } from '../utils/constants.js';
import { fileSchema } from './schemas.js';

const assignmentSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 3000 },
    type: { type: String, enum: ASSIGNMENT_TYPES, default: 'homework', index: true },
    attachments: { type: [fileSchema], default: [] },
    dueDate: { type: Date, required: true, index: true },
    maxScore: { type: Number, default: 100, min: 1 },
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

assignmentSchema.index({ group: 1, dueDate: 1 });

const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
export default Assignment;
