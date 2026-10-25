import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as sessionService from '../services/session.service.js';

export const createSession = asyncHandler(async (req, res) => {
  const session = await sessionService.createSession(req.body, req.user._id);
  sendCreated(res, { message: 'Session scheduled successfully', data: session });
});

export const generateRecurringSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionService.generateRecurringSessions(
    req.body.groupId,
    req.body.startDate,
    req.body.weeksAhead,
    req.user._id,
  );
  sendCreated(res, {
    message: `${sessions.length} recurring session instances generated`,
    data: sessions,
  });
});

export const updateSession = asyncHandler(async (req, res) => {
  const session = await sessionService.updateSession(req.params.id, req.body, req.user._id);
  sendSuccess(res, { message: 'Session updated successfully', data: session });
});

export const cancelSession = asyncHandler(async (req, res) => {
  const session = await sessionService.cancelSession(
    req.params.id,
    req.user._id,
    req.body.reason,
  );
  sendSuccess(res, { message: 'Session cancelled', data: session });
});

export const getCalendarSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionService.getCalendarSessions(req.user, req.query);
  sendSuccess(res, { data: sessions });
});

export default {
  createSession,
  generateRecurringSessions,
  updateSession,
  cancelSession,
  getCalendarSessions,
};
