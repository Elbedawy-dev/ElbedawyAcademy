import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import * as teacherService from '../services/teacher.service.js';

export const getMyTeacherProfile = asyncHandler(async (req, res) => {
  const profile = await teacherService.getMyTeacherProfile(req.user._id);
  sendSuccess(res, { data: profile });
});

export const updateMyTeacherProfile = asyncHandler(async (req, res) => {
  const profile = await teacherService.updateMyTeacherProfile(req.user._id, req.body);
  sendSuccess(res, { message: 'Teacher profile updated', data: profile });
});

export const uploadCertificates = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw AppError.badRequest('At least one certificate file is required');
  }
  const certs = await teacherService.addCertificates(req.user._id, req.files, req.body);
  sendCreated(res, { message: 'Certificates uploaded successfully', data: certs });
});

export const deleteCertificate = asyncHandler(async (req, res) => {
  const result = await teacherService.deleteCertificate(req.user._id, req.params.certId);
  sendSuccess(res, { message: result.message });
});

export const getCertificateDownloadUrl = asyncHandler(async (req, res) => {
  const result = await teacherService.getCertificateDownload(
    req.user,
    req.params.teacherId || req.user._id,
    req.params.certId,
  );
  sendSuccess(res, { data: result });
});

export const adminApproveRejectTeacher = asyncHandler(async (req, res) => {
  const profile = await teacherService.adminApproveRejectTeacher(
    req.params.id,
    req.body.status,
    req.body.reason,
    req.user,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, {
    message: `Teacher status updated to ${req.body.status}`,
    data: profile,
  });
});

export const adminReviewCertificate = asyncHandler(async (req, res) => {
  const cert = await teacherService.adminReviewCertificate(
    req.params.teacherId,
    req.params.certId,
    req.body.status,
    req.body.adminNote,
    req.user,
    { ip: req.ip, userAgent: req.get('user-agent') },
  );
  sendSuccess(res, { message: 'Certificate reviewed', data: cert });
});

export const getTeacherCatalogue = asyncHandler(async (req, res) => {
  const result = await teacherService.getTeacherCatalogue(req.query);
  sendSuccess(res, { data: result.data, meta: result.meta });
});

export const getTeacherPublicProfile = asyncHandler(async (req, res) => {
  const profile = await teacherService.getTeacherPublicProfile(req.params.id);
  sendSuccess(res, { data: profile });
});

export default {
  getMyTeacherProfile,
  updateMyTeacherProfile,
  uploadCertificates,
  deleteCertificate,
  getCertificateDownloadUrl,
  adminApproveRejectTeacher,
  adminReviewCertificate,
  getTeacherCatalogue,
  getTeacherPublicProfile,
};
