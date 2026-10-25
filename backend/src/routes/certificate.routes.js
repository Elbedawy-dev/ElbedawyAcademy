import express from 'express';
import * as certController from '../controllers/certificate.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';

const router = express.Router();

// Public certificate verification & PDF download
router.get('/verify/:code', certController.verifyCertificate);
router.get('/download/:code', certController.downloadCertificatePdf);

// Authenticated certificate endpoints
router.use(protect);
router.get('/student/:studentId', certController.getStudentCertificates);
router.post(
  '/issue/:studentId',
  restrictTo('teacher', 'admin'),
  certController.issueCertificate,
);

export default router;
