import mongoose from 'mongoose';

const parentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile' }],
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

parentProfileSchema.index({ children: 1 });

const ParentProfile =
  mongoose.models.ParentProfile || mongoose.model('ParentProfile', parentProfileSchema);
export default ParentProfile;
