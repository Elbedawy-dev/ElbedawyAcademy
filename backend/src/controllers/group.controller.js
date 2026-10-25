import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as groupService from '../services/group.service.js';

export const createGroup = asyncHandler(async (req, res) => {
  const group = await groupService.createGroup(req.user._id, req.body);
  sendCreated(res, { message: 'Group created successfully', data: group });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await groupService.updateGroup(
    req.params.id,
    req.user._id,
    req.body,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: 'Group updated successfully', data: group });
});

export const regenerateJoinCode = asyncHandler(async (req, res) => {
  const result = await groupService.regenerateJoinCode(req.params.id, req.user._id);
  sendSuccess(res, { message: 'Join code regenerated', data: result });
});

export const listMyGroups = asyncHandler(async (req, res) => {
  const result = await groupService.listMyGroups(req.user, req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const getGroupById = asyncHandler(async (req, res) => {
  const group = await groupService.getGroupById(req.params.id, req.user);
  sendSuccess(res, { data: group });
});

export const listGroupMembers = asyncHandler(async (req, res) => {
  const members = await groupService.listGroupMembers(req.params.id, req.user, req.query.status);
  sendSuccess(res, { data: members });
});

export const removeMember = asyncHandler(async (req, res) => {
  const result = await groupService.removeMember(
    req.params.groupId,
    req.params.studentId,
    req.user._id,
    req.body.reason,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: result.message });
});

export const moveMember = asyncHandler(async (req, res) => {
  const result = await groupService.moveMember(
    req.params.groupId,
    req.body.targetGroupId,
    req.body.studentId,
    req.user._id,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: result.message });
});

export default {
  createGroup,
  updateGroup,
  regenerateJoinCode,
  listMyGroups,
  getGroupById,
  listGroupMembers,
  removeMember,
  moveMember,
};
