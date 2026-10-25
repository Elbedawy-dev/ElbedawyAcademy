import { z } from 'zod';
import { GENDERS, LANGUAGES, ROLE_VALUES } from '../utils/constants.js';

const addressSchema = z.object({
  country: z.string().min(2).max(80).optional(),
  governorate: z.string().max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  street: z.string().max(160).optional(),
  details: z.string().max(300).optional(),
});

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(8).max(20).optional(),
    gender: z.enum(GENDERS).optional(),
    dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
      message: 'Date of birth cannot be in the future',
    }).optional(),
    address: addressSchema.optional(),
    language: z.enum(LANGUAGES).optional(),
    timezone: z.string().optional(),
    email: z.string().email().max(160).optional(),
  }),
});

export const adminUpdateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().max(160).optional(),
    phone: z.string().min(8).max(20).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    gender: z.enum(GENDERS).optional(),
    dateOfBirth: z.coerce.date().optional(),
    address: addressSchema.optional(),
    isActive: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
    language: z.enum(LANGUAGES).optional(),
    timezone: z.string().optional(),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
  }),
});
