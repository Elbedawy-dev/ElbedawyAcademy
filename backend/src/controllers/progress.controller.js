import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as progressService from '../services/progress.service.js';

export const addQuranEntry = asyncHandler(async (req, res) => {
  const entry = await progressService.addQuranEntry(req.user._id, req.body);
  sendCreated(res, { message: 'Quran progress recorded', data: entry });
});

export const updateQuranEntry = asyncHandler(async (req, res) => {
  const entry = await progressService.updateQuranEntry(req.params.id, req.user._id, req.body);
  sendSuccess(res, { message: 'Progress entry updated', data: entry });
});

export const deleteQuranEntry = asyncHandler(async (req, res) => {
  const result = await progressService.deleteQuranEntry(req.params.id, req.user._id);
  sendSuccess(res, { message: result.message });
});

export const getStudentQuranTimeline = asyncHandler(async (req, res) => {
  const result = await progressService.getStudentQuranTimeline(
    req.params.studentId,
    req.user,
    req.query,
  );
  sendSuccess(res, { data: result.data, meta: { ...result.meta, summary: result.summary } });
});

export const getNeedsReviewSuggestions = asyncHandler(async (req, res) => {
  const result = await progressService.getNeedsReviewSuggestions(
    req.params.studentId,
    req.user,
    req.query.days ? Number(req.query.days) : 14,
  );
  sendSuccess(res, { data: result });
});

export const recordSchoolProgress = asyncHandler(async (req, res) => {
  const progress = await progressService.recordSchoolProgress(req.user._id, req.body);
  sendCreated(res, { message: 'School progress recorded', data: progress });
});

export const getStudentSchoolProgress = asyncHandler(async (req, res) => {
  const records = await progressService.getStudentSchoolProgress(req.params.studentId, req.user);
  sendSuccess(res, { data: records });
});

export const exportProgressPdf = asyncHandler(async (req, res) => {
  const pdfStream = await progressService.generateProgressPdf(req.params.studentId, req.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="progress_report_${req.params.studentId}.pdf"`,
  );
  pdfStream.pipe(res);
});

export default {
  addQuranEntry,
  updateQuranEntry,
  deleteQuranEntry,
  getStudentQuranTimeline,
  getNeedsReviewSuggestions,
  recordSchoolProgress,
  getStudentSchoolProgress,
  exportProgressPdf,
};
