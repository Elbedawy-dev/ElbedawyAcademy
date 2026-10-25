import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as certService from '../services/certificate.service.js';

export const issueCertificate = asyncHandler(async (req, res) => {
  const cert = await certService.issueCertificate(
    req.params.studentId,
    req.body,
    req.user._id,
  );
  sendCreated(res, { message: 'Certificate issued successfully', data: cert });
});

export const verifyCertificate = asyncHandler(async (req, res) => {
  const result = await certService.verifyCertificate(req.params.code);
  sendSuccess(res, { data: result });
});

export const getStudentCertificates = asyncHandler(async (req, res) => {
  const certs = await certService.getStudentCertificates(req.params.studentId || req.user._id);
  sendSuccess(res, { data: certs });
});

export const downloadCertificatePdf = asyncHandler(async (req, res) => {
  const pdfStream = await certService.generateCertificatePdf(req.params.code);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="certificate_${req.params.code}.pdf"`,
  );
  pdfStream.pipe(res);
});

export default {
  issueCertificate,
  verifyCertificate,
  getStudentCertificates,
  downloadCertificatePdf,
};
