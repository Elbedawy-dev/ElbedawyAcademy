import mongoose from 'mongoose';

/** Reusable embedded file descriptor for Cloudinary uploads. */
export const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    resourceType: { type: String, default: 'image' },
    format: { type: String },
    bytes: { type: Number },
    originalName: { type: String },
    mimeType: { type: String },
  },
  { _id: false },
);

export const imageSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false },
);

export const addressSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true, maxlength: 80 },
    governorate: { type: String, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 80 },
    street: { type: String, trim: true, maxlength: 160 },
    details: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);
