import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as roomService from '../services/room.service.js';

export const getMyRoom = asyncHandler(async (req, res) => {
  const room = await roomService.getMyRoom(req.user._id);
  sendSuccess(res, { data: room });
});

export const updateMyRoom = asyncHandler(async (req, res) => {
  const coverBuffer = req.file ? req.file.buffer : undefined;
  const room = await roomService.updateMyRoom(req.user._id, req.body, coverBuffer);
  sendSuccess(res, { message: 'Room updated successfully', data: room });
});

export const getRoomStats = asyncHandler(async (req, res) => {
  const result = await roomService.getRoomStats(req.user._id);
  sendSuccess(res, { data: result });
});

export default {
  getMyRoom,
  updateMyRoom,
  getRoomStats,
};
