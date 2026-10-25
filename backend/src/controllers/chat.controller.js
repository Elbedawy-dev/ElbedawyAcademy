import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as chatService from '../services/chat.service.js';

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(
    req.params.groupId,
    req.user._id,
    req.body,
    req.files || [],
  );
  sendCreated(res, { message: 'Message sent', data: message });
});

export const getGroupMessages = asyncHandler(async (req, res) => {
  const result = await chatService.getGroupMessages(req.params.groupId, req.user, req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const editMessage = asyncHandler(async (req, res) => {
  const message = await chatService.editMessage(req.params.id, req.user._id, req.body.content);
  sendSuccess(res, { message: 'Message edited', data: message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const result = await chatService.deleteMessage(req.params.id, req.user);
  sendSuccess(res, { message: result.message });
});

export const markMessagesAsRead = asyncHandler(async (req, res) => {
  await chatService.markMessagesAsRead(req.params.groupId, req.user._id);
  sendSuccess(res, { message: 'Messages marked as read' });
});

export const muteStudent = asyncHandler(async (req, res) => {
  const result = await chatService.muteStudentInGroup(
    req.params.groupId,
    req.params.studentId,
    req.user._id,
    req.body.mute !== false,
  );
  sendSuccess(res, { message: result.message });
});

export default {
  sendMessage,
  getGroupMessages,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  muteStudent,
};
