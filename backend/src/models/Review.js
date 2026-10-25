import mongoose from 'mongoose';
import { REVIEW_STATUS } from '../utils/constants.js';

const reviewSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: REVIEW_STATUS, default: 'visible', index: true },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
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

reviewSchema.index({ reviewer: 1, group: 1 }, { unique: true });
reviewSchema.index({ teacher: 1, status: 1, rating: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
