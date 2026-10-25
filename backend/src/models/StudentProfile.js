import mongoose from 'mongoose';
import { STUDENT_GRADES, STUDENT_QURAN_LEVELS } from '../utils/constants.js';

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    grade: { type: String, enum: STUDENT_GRADES, default: 'none' },
    schoolName: { type: String, trim: true, maxlength: 150 },
    parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    quranLevel: { type: String, enum: STUDENT_QURAN_LEVELS, default: 'none' },
    notes: { type: String, trim: true, maxlength: 2000 },
    // One-time code a student shares with a parent to link accounts
    linkCode: { type: String, select: false },
    linkCodeExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.linkCode;
        delete ret.linkCodeExpires;
        return ret;
      },
    },
  },
);

studentProfileSchema.index({ parents: 1 });
studentProfileSchema.index({ linkCode: 1 }, { sparse: true });

const StudentProfile =
  mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
