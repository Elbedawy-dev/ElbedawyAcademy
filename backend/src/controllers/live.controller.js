import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as liveService from '../services/live.service.js';

export const startLiveSession = asyncHandler(async (req, res) => {
  const credentials = await liveService.startLiveSession(req.params.sessionId, req.user._id);
  sendSuccess(res, { message: 'Live session started', data: credentials });
});

export const getLiveJoinToken = asyncHandler(async (req, res) => {
  const tokenData = await liveService.getLiveJoinToken(req.params.sessionId, req.user);
  sendSuccess(res, { message: 'Join token acquired', data: tokenData });
});

export const endLiveSession = asyncHandler(async (req, res) => {
  const session = await liveService.endLiveSession(
    req.params.sessionId,
    req.user._id,
    req.body.recordingUrl,
  );
  sendSuccess(res, { message: 'Live session ended', data: session });
});

export const kickParticipant = asyncHandler(async (req, res) => {
  const result = await liveService.kickParticipant(
    req.params.sessionId,
    req.user._id,
    req.params.studentId,
  );
  sendSuccess(res, { message: result.message });
});

export const muteParticipant = asyncHandler(async (req, res) => {
  const result = await liveService.muteParticipant(
    req.params.sessionId,
    req.user._id,
    req.params.studentId,
    req.body.mute !== false,
  );
  sendSuccess(res, { message: result.message });
});

export default {
  startLiveSession,
  getLiveJoinToken,
  endLiveSession,
  kickParticipant,
  muteParticipant,
};
