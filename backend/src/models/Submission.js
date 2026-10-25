import mongoose from 'mongoose';
import { SUBMISSION_STATUS } from '../utils/constants.js';
import { fileSchema } from './schemas.js';

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    files: { type: [fileSchema], default: [] },
    answerText: { type: String, trim: true, maxlength: 4000 },
    score: { type: Number, min: 0 },
    feedback: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: SUBMISSION_STATUS, default: 'submitted', index: true },
    submittedAt: { type: Date, default: Date.now },
    isLate: { type: Boolean, default: false },
    gradedAt: { type: Date },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ group: 1, status: 1 });

const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
export default Submission;
