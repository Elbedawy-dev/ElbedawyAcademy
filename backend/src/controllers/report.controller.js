import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as reportService from '../services/report.service.js';

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.user._id, req.body);
  sendCreated(res, { message: 'Report submitted successfully', data: report });
});

export const resolveReport = asyncHandler(async (req, res) => {
  const report = await reportService.resolveReport(req.params.id, req.body, req.user);
  sendSuccess(res, { message: 'Report resolved', data: report });
});

export const listReports = asyncHandler(async (req, res) => {
  const result = await reportService.listReports(req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export default {
  createReport,
  resolveReport,
  listReports,
};
