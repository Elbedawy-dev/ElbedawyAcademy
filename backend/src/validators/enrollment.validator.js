import { z } from 'zod';

export const requestEnrollmentSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
  }),
});

export const joinByCodeSchema = z.object({
  body: z.object({
    code: z.string().min(4).max(30).trim(),
  }),
});

export const parentEnrollSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID'),
    code: z.string().min(4).max(30).trim().optional(),
  }),
});

export const updateEnrollmentStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    action: z.enum(['accept', 'reject', 'pause', 'resume', 'cancel']),
    reason: z.string().max(500).optional(),
  }),
});
