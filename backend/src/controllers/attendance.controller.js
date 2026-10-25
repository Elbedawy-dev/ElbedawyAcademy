import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as attendanceService from '../services/attendance.service.js';

export const manualEditAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.manualEditAttendance(
    req.params.sessionId,
    req.params.studentId,
    req.user._id,
    req.body.status,
    req.body.note,
  );
  sendSuccess(res, { message: 'Attendance updated', data: attendance });
});

export const getSessionAttendance = asyncHandler(async (req, res) => {
  const records = await attendanceService.getSessionAttendance(req.params.sessionId, req.user._id);
  sendSuccess(res, { data: records });
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  const report = await attendanceService.getStudentAttendanceReport(req.params.studentId, req.user);
  sendSuccess(res, { data: report });
});

export const getGroupAttendance = asyncHandler(async (req, res) => {
  const report = await attendanceService.getGroupAttendanceReport(req.params.groupId, req.user._id);
  sendSuccess(res, { data: report });
});

export default {
  manualEditAttendance,
  getSessionAttendance,
  getStudentAttendance,
  getGroupAttendance,
};
