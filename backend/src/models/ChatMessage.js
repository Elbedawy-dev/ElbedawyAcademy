import mongoose from 'mongoose';
import { MESSAGE_TYPES } from '../utils/constants.js';
import { fileSchema } from './schemas.js';

const readReceiptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    content: { type: String, trim: true, maxlength: 3000 },
    attachments: { type: [fileSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
    readBy: { type: [readReceiptSchema], default: [] },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
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

chatMessageSchema.index({ group: 1, createdAt: -1 });

const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
