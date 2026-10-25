import mongoose from 'mongoose';
import { CURRENCIES } from '../utils/constants.js';

const settingsSchema = new mongoose.Schema(
  {
    platformCommissionPercent: { type: Number, default: 15, min: 0, max: 100 },
    allowMixedGroups: { type: Boolean, default: true },
    enforceGenderMatch: { type: Boolean, default: false },
    minAgeForOwnAccount: { type: Number, default: 13, min: 5, max: 21 },
    subscriptionGraceDays: { type: Number, default: 3, min: 0, max: 30 },
    minSessionsBeforeReview: { type: Number, default: 2, min: 1, max: 50 },
    chatEditWindowMinutes: { type: Number, default: 15, min: 1, max: 1440 },
    supportedCurrencies: { type: [String], default: CURRENCIES },
    maintenanceMode: { type: Boolean, default: false },
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

settingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;
