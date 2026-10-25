import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as parentService from '../services/parent.service.js';

export const getChildren = asyncHandler(async (req, res) => {
  const children = await parentService.getLinkedChildren(req.user._id);
  sendSuccess(res, { data: children });
});

export const createChildAccount = asyncHandler(async (req, res) => {
  const child = await parentService.createChildAccount(req.user._id, req.body);
  sendCreated(res, { message: 'Child account created successfully', data: child });
});

export const linkChildByCode = asyncHandler(async (req, res) => {
  const result = await parentService.linkChildByCode(req.user._id, req.body.code);
  sendSuccess(res, { message: result.message, data: result.student });
});

export const generateStudentLinkCode = asyncHandler(async (req, res) => {
  const result = await parentService.generateStudentLinkCode(req.user._id);
  sendSuccess(res, { message: 'Link code generated', data: result });
});

export const getChildSummary = asyncHandler(async (req, res) => {
  const summary = await parentService.getChildDashboardSummary(req.user._id, req.params.studentId);
  sendSuccess(res, { data: summary });
});

export default {
  getChildren,
  createChildAccount,
  linkChildByCode,
  generateStudentLinkCode,
  getChildSummary,
};
