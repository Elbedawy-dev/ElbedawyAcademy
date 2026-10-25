import { z } from 'zod';
import {
  GROUP_GENDER_TYPES,
  GROUP_LEVELS,
  JOIN_MODES,
  BILLING_CYCLES,
  CURRENCIES,
  DAYS_OF_WEEK,
} from '../utils/constants.js';

const scheduleSlotSchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK.map(String)).transform(Number),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format must be HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format must be HH:mm'),
  timezone: z.string().optional(),
});

const priceSchema = z.object({
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.enum(CURRENCIES).default('EGP'),
  billingCycle: z.enum(BILLING_CYCLES).default('monthly'),
});

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    subject: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid subject ID'),
    gradeLevel: z.enum(GROUP_LEVELS),
    genderType: z.enum(GROUP_GENDER_TYPES),
    maxStudents: z.number().int().min(1).max(100).default(15),
    price: priceSchema,
    schedule: z.array(scheduleSlotSchema).min(1, 'At least one weekly slot is required'),
    joinMode: z.enum(JOIN_MODES).default('request'),
  }),
});

export const updateGroupSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    gradeLevel: z.enum(GROUP_LEVELS).optional(),
    genderType: z.enum(GROUP_GENDER_TYPES).optional(),
    maxStudents: z.number().int().min(1).max(100).optional(),
    price: priceSchema.optional(),
    schedule: z.array(scheduleSlotSchema).optional(),
    joinMode: z.enum(JOIN_MODES).optional(),
    status: z.enum(['open', 'full', 'closed']).optional(),
  }),
});

export const moveMemberSchema = z.object({
  params: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    targetGroupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});
