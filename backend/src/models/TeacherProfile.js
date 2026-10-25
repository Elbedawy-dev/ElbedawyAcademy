import mongoose from 'mongoose';
import {
  TEACHER_STATUS,
  TEACHER_SPECIALTIES,
  CERTIFICATE_FILE_TYPES,
  CERT_VERIFICATION_STATUS,
} from '../utils/constants.js';

const certificateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    issuer: { type: String, trim: true, maxlength: 150 },
    type: { type: String, enum: CERTIFICATE_FILE_TYPES, default: 'other' },
    // Authenticated Cloudinary asset URL - never sent to clients; use signed URLs instead
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, default: 'image' },
    format: { type: String },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    verificationStatus: { type: String, enum: CERT_VERIFICATION_STATUS, default: 'pending' },
    adminNote: { type: String, trim: true, maxlength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: false },
);

const teacherProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    specialties: { type: [{ type: String, enum: TEACHER_SPECIALTIES }], default: [] },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    certificates: { type: [certificateSchema], default: [] },
    yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
    status: { type: String, enum: TEACHER_STATUS, default: 'pending', index: true },
    submittedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    suspensionReason: { type: String, trim: true, maxlength: 1000 },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    // AES-256-GCM encrypted JSON (see utils/crypto.js)
    bankOrWalletInfo: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.bankOrWalletInfo;
        if (Array.isArray(ret.certificates)) {
          ret.certificates = ret.certificates.map((c) => {
            const { fileUrl: _f, publicId: _p, ...rest } = c;
            return { ...rest, id: String(c._id) };
          });
        }
        return ret;
      },
    },
  },
);

teacherProfileSchema.index({ status: 1, ratingAvg: -1 });
teacherProfileSchema.index({ subjects: 1, status: 1 });
teacherProfileSchema.index({ specialties: 1, status: 1 });

const TeacherProfile =
  mongoose.models.TeacherProfile || mongoose.model('TeacherProfile', teacherProfileSchema);
export default TeacherProfile;
