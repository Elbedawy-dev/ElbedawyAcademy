import mongoose from 'mongoose';

const parentLinkSchema = new mongoose.Schema(
  {
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    method: { type: String, enum: ['code', 'invitation', 'created'], required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: { type: Date },
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

parentLinkSchema.index({ parent: 1, student: 1 }, { unique: true });
parentLinkSchema.index({ student: 1, status: 1 });
parentLinkSchema.index({ parent: 1, status: 1 });

const ParentLink = mongoose.models.ParentLink || mongoose.model('ParentLink', parentLinkSchema);
export default ParentLink;
