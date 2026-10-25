import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as enrollmentService from '../services/enrollment.service.js';

export const requestJoinGroup = asyncHandler(async (req, res) => {
  const result = await enrollmentService.requestJoinGroup(req.body.groupId, req.user._id);
  if (result.requiresPayment) {
    return sendSuccess(res, {
      message: 'Payment required to complete enrollment',
      data: result,
    });
  }
  sendCreated(res, {
    message: result.status === 'active' ? 'Joined group successfully' : 'Join request submitted',
    data: result,
  });
});

export const joinByCode = asyncHandler(async (req, res) => {
  const result = await enrollmentService.joinByCode(req.body.code, req.user._id);
  if (result.requiresPayment) {
    return sendSuccess(res, {
      message: 'Payment required to complete enrollment',
      data: result,
    });
  }
  sendSuccess(res, { message: 'Enrolled in group successfully', data: result });
});

export const parentEnrollChild = asyncHandler(async (req, res) => {
  const result = await enrollmentService.parentEnrollChild(
    req.user._id,
    req.body.groupId,
    req.body.studentId,
    req.body.code,
  );
  if (result.requiresPayment) {
    return sendSuccess(res, {
      message: 'Payment required to complete enrollment',
      data: result,
    });
  }
  sendCreated(res, {
    message: result.status === 'pending' ? 'Join request submitted' : 'Child enrolled in group successfully',
    data: result,
  });
});

export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const result = await enrollmentService.updateEnrollmentStatus(
    req.params.id,
    req.body.action,
    req.body.reason,
    req.user,
  );
  if (result.requiresPayment) {
    return sendSuccess(res, {
      message: 'Join request accepted. Awaiting student payment.',
      data: result,
    });
  }
  sendSuccess(res, { message: 'Enrollment status updated', data: result });
});

export default {
  requestJoinGroup,
  joinByCode,
  parentEnrollChild,
  updateEnrollmentStatus,
};
