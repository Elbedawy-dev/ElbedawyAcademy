import { z } from 'zod';
import { PAYMENT_METHODS } from '../utils/constants.js';

export const createCheckoutSchema = z.object({
  body: z.object({
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).default('card'),
  }),
});

export const refundPaymentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    reason: z.string().min(3).max(500),
  }),
});

export const updatePayoutStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    status: z.enum(['approved', 'paid']),
    reference: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
  }),
});
