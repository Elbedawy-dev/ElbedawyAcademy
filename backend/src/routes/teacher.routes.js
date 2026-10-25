import express from 'express';
import * as teacherController from '../controllers/teacher.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadCertificates } from '../middlewares/upload.middleware.js';
import {
  updateTeacherProfileSchema,
  addCertificateSchema,
  reviewCertificateSchema,
  teacherApprovalSchema,
  catalogueQuerySchema,
} from '../validators/teacher.validator.js';

const router = express.Router();

// Public catalogue and profiles
router.get('/catalogue', validate(catalogueQuerySchema), teacherController.getTeacherCatalogue);
router.get('/profile/:id', teacherController.getTeacherPublicProfile);

// Authenticated teacher endpoints
router.use(protect);

router.get('/me/profile', restrictTo('teacher'), teacherController.getMyTeacherProfile);
router.patch(
  '/me/profile',
  restrictTo('teacher'),
  validate(updateTeacherProfileSchema),
  teacherController.updateMyTeacherProfile,
);

router.post(
  '/me/certificates',
  restrictTo('teacher'),
  uploadCertificates,
  validate(addCertificateSchema),
  teacherController.uploadCertificates,
);

router.delete(
  '/me/certificates/:certId',
  restrictTo('teacher'),
  teacherController.deleteCertificate,
);

router.get(
  '/me/certificates/:certId/download',
  restrictTo('teacher', 'admin'),
  teacherController.getCertificateDownloadUrl,
);

// Admin review & approval routes
router.use(restrictTo('admin'));
router.patch(
  '/:id/approval',
  validate(teacherApprovalSchema),
  teacherController.adminApproveRejectTeacher,
);
router.patch(
  '/:teacherId/certificates/:certId/review',
  validate(reviewCertificateSchema),
  teacherController.adminReviewCertificate,
);
router.get(
  '/:teacherId/certificates/:certId/download',
  teacherController.getCertificateDownloadUrl,
);

export default router;
