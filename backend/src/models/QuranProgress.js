import mongoose from 'mongoose';
import { QURAN_ENTRY_TYPES, QURAN_RATINGS } from '../utils/constants.js';

const mistakesSchema = new mongoose.Schema(
  {
    hifz: { type: Number, default: 0, min: 0 },
    tajweed: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const quranProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    entryType: { type: String, enum: QURAN_ENTRY_TYPES, required: true, index: true },
    surah: { type: Number, required: true, min: 1, max: 114 },
    fromAyah: { type: Number, required: true, min: 1 },
    toAyah: { type: Number, required: true, min: 1 },
    pageFrom: { type: Number, min: 1, max: 604 },
    pageTo: { type: Number, min: 1, max: 604 },
    juz: { type: Number, required: true, min: 1, max: 30, index: true },
    rating: { type: String, enum: QURAN_RATINGS, required: true, default: 'good' },
    mistakes: { type: mistakesSchema, default: () => ({}) },
    tafsirCovered: {
      covered: { type: Boolean, default: false },
      notes: { type: String, trim: true, maxlength: 1000 },
    },
    teacherNote: { type: String, trim: true, maxlength: 1000 },
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

quranProgressSchema.index({ student: 1, date: -1 });
quranProgressSchema.index({ student: 1, entryType: 1, date: -1 });
quranProgressSchema.index({ student: 1, juz: 1, surah: 1 });

const QuranProgress =
  mongoose.models.QuranProgress || mongoose.model('QuranProgress', quranProgressSchema);
export default QuranProgress;
