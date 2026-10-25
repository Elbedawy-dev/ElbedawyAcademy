import { z } from 'zod';
import {
  TEACHER_SPECIALTIES,
  CERTIFICATE_FILE_TYPES,
  CERT_VERIFICATION_STATUS,
  GENDERS,
} from '../utils/constants.js';

export const updateTeacherProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(2000).optional(),
    specialties: z.array(z.enum(TEACHER_SPECIALTIES)).optional(),
    subjects: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    yearsOfExperience: z.number().min(0).max(80).optional(),
    bankOrWalletInfo: z.record(z.any()).optional(),
  }),
});

export const addCertificateSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(150),
    issuer: z.string().max(150).optional(),
    type: z.enum(CERTIFICATE_FILE_TYPES).optional(),
  }),
});

export const reviewCertificateSchema = z.object({
  params: z.object({
    teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    certId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(CERT_VERIFICATION_STATUS),
    adminNote: z.string().max(500).optional(),
  }),
});

export const teacherApprovalSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'suspended']),
    reason: z.string().max(1000).optional(),
  }).refine((data) => {
    if ((data.status === 'rejected' || data.status === 'suspended') && !data.reason) {
      return false;
    }
    return true;
  }, {
    message: 'Reason is required when rejecting or suspending a teacher',
    path: ['reason'],
  }),
});

export const catalogueQuerySchema = z.object({
  query: z.object({
    subject: z.string().optional(),
    grade: z.string().optional(),
    rating: z.coerce.number().min(1).max(5).optional(),
    gender: z.enum(GENDERS).optional(),
    specialty: z.enum(TEACHER_SPECIALTIES).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
  }),
});
