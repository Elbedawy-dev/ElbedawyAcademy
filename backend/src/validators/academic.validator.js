import { z } from 'zod';
import {
  ASSIGNMENT_TYPES,
  ATTENDANCE_STATUS,
  REPORT_TARGETS,
  STUDENT_GRADES,
  GENDERS,
} from '../utils/constants.js';

export const createAssignmentSchema = z.object({
  body: z.object({
    group: z.string().regex(/^[0-9a-fA-F]{24}$/),
    title: z.string().min(2).max(150),
    description: z.string().max(3000).optional(),
    type: z.enum(ASSIGNMENT_TYPES).default('homework'),
    dueDate: z.coerce.date(),
    maxScore: z.number().min(1).default(100),
  }),
});

export const gradeSubmissionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    score: z.number().min(0),
    feedback: z.string().max(2000).optional(),
  }),
});

export const updateAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(ATTENDANCE_STATUS),
    note: z.string().max(500).optional(),
  }),
});

export const createReviewSchema = z.object({
  body: z.object({
    group: z.string().regex(/^[0-9a-fA-F]{24}$/),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});

export const createReportSchema = z.object({
  body: z.object({
    targetType: z.enum(REPORT_TARGETS),
    targetId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    reason: z.string().min(3).max(1000),
  }),
});

export const resolveReportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(['resolved', 'dismissed']),
    resolutionNotes: z.string().max(1000).optional(),
  }),
});

export const createChildAccountSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    gender: z.enum(GENDERS),
    dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
      message: 'Date of birth cannot be in the future',
    }),
    grade: z.enum(STUDENT_GRADES).default('none'),
    schoolName: z.string().max(150).optional(),
    password: z.string().min(6).optional(),
  }),
});

export const linkChildByCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4).max(30).trim(),
  }),
});
