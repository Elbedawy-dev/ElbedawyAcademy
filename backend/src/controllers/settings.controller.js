import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as settingsService from '../services/settings.service.js';
import * as analyticsService from '../services/analytics.service.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  sendSuccess(res, { data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(
    req.body,
    req.user,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: 'Settings updated successfully', data: settings });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await settingsService.listAuditLogs(req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getAdminAnalytics();
  sendSuccess(res, { data: analytics });
});

export default {
  getSettings,
  updateSettings,
  listAuditLogs,
  getAdminAnalytics,
};
