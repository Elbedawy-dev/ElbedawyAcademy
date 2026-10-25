import mongoose from 'mongoose';
import { SCHOOL_TERMS } from '../utils/constants.js';

const gradeEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
  },
  { _id: true },
);

const schoolProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    term: { type: String, enum: SCHOOL_TERMS, default: 'term_1', index: true },
    topicsCovered: [{ type: String, trim: true }],
    grades: { type: [gradeEntrySchema], default: [] },
    teacherNote: { type: String, trim: true, maxlength: 1500 },
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

schoolProgressSchema.index({ student: 1, subject: 1, term: 1 });

const SchoolProgress =
  mongoose.models.SchoolProgress || mongoose.model('SchoolProgress', schoolProgressSchema);
export default SchoolProgress;
