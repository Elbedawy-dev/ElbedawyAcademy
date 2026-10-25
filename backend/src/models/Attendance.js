import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../utils/constants.js';

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUS, default: 'absent', index: true },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    markedAutomatically: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 500 },
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

attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ student: 1, status: 1 });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export default Attendance;
