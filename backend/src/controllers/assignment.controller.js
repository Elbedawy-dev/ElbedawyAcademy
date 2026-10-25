import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as assignmentService from '../services/assignment.service.js';

export const createAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.createAssignment(
    req.user._id,
    req.body,
    req.files || [],
  );
  sendCreated(res, { message: 'Assignment created successfully', data: assignment });
});

export const listGroupAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.listGroupAssignments(req.params.groupId);
  sendSuccess(res, { data: assignments });
});

export const submitAssignment = asyncHandler(async (req, res) => {
  const submission = await assignmentService.submitAssignment(
    req.params.id,
    req.user._id,
    req.body,
    req.files || [],
  );
  sendCreated(res, { message: 'Assignment submitted successfully', data: submission });
});

export const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await assignmentService.gradeSubmission(
    req.params.id,
    req.user._id,
    req.body,
  );
  sendSuccess(res, { message: 'Submission graded successfully', data: submission });
});

export const getSubmissionsForAssignment = asyncHandler(async (req, res) => {
  const submissions = await assignmentService.getSubmissionsForAssignment(
    req.params.id,
    req.user._id,
  );
  sendSuccess(res, { data: submissions });
});

export default {
  createAssignment,
  listGroupAssignments,
  submitAssignment,
  gradeSubmission,
  getSubmissionsForAssignment,
};
