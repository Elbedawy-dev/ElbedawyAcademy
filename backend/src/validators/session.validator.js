import { z } from 'zod';
import { SESSION_TYPES } from '../utils/constants.js';

export const createSessionSchema = z.object({
  body: z.object({
    group: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
    title: z.string().min(2).max(150),
    type: z.enum(SESSION_TYPES),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    notes: z.string().max(2000).optional(),
  }).refine((data) => data.scheduledEnd > data.scheduledStart, {
    message: 'scheduledEnd must be after scheduledStart',
    path: ['scheduledEnd'],
  }),
});

export const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    title: z.string().min(2).max(150).optional(),
    type: z.enum(SESSION_TYPES).optional(),
    scheduledStart: z.coerce.date().optional(),
    scheduledEnd: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(['scheduled', 'cancelled']).optional(),
    cancellationReason: z.string().max(500).optional(),
  }),
});

export const calendarQuerySchema = z.object({
  query: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    groupId: z.string().optional(),
    timezone: z.string().optional(),
  }).refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  }),
});

export const generateRecurringSessionsSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    startDate: z.coerce.date(),
    weeksAhead: z.number().int().min(1).max(12).default(4),
  }),
});
