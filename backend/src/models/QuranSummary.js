import mongoose from 'mongoose';

const lastReviewDateByJuzSchema = new mongoose.Schema(
  {
    juz: { type: Number, required: true, min: 1, max: 30 },
    lastReviewedAt: { type: Date, required: true },
  },
  { _id: false },
);

const currentPositionSchema = new mongoose.Schema(
  {
    surah: { type: Number, min: 1, max: 114 },
    ayah: { type: Number, min: 1 },
    page: { type: Number, min: 1, max: 604 },
    juz: { type: Number, min: 1, max: 30 },
  },
  { _id: false },
);

const quranSummarySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalPagesMemorized: { type: Number, default: 0, min: 0, max: 604 },
    memorizedPagesList: { type: [Number], default: [] },
    juzCompleted: { type: [Number], default: [] },
    currentPosition: { type: currentPositionSchema, default: () => ({}) },
    lastReviewDateByJuz: { type: [lastReviewDateByJuzSchema], default: [] },
    percentageMemorized: { type: Number, default: 0, min: 0, max: 100 },
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

quranSummarySchema.index({ totalPagesMemorized: -1 });

const QuranSummary =
  mongoose.models.QuranSummary || mongoose.model('QuranSummary', quranSummarySchema);
export default QuranSummary;
