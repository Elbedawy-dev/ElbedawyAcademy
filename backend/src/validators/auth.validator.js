import { z } from 'zod';
import {
  GENDERS,
  SELF_REGISTER_ROLES,
  LANGUAGES,
} from '../utils/constants.js';

const addressSchema = z.object({
  country: z.string().min(2, 'Country is required').max(80),
  city: z.string().min(2, 'City is required').max(80),
  governorate: z.string().max(80).optional(),
  street: z.string().max(160).optional(),
  details: z.string().max(300).optional(),
});

export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, 'Name must be at least 2 characters').max(100),
      email: z.string().email('Invalid email address').max(160),
      phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      role: z.enum(SELF_REGISTER_ROLES, {
        errorMap: () => ({ message: 'Role must be student, parent, or teacher' }),
      }),
      gender: z.enum(GENDERS, {
        errorMap: () => ({ message: 'Gender must be male or female' }),
      }),
      dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
        message: 'Date of birth cannot be in the future',
      }),
      address: addressSchema,
      language: z.enum(LANGUAGES).optional().default('ar'),
      timezone: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const now = new Date();
      const birth = new Date(data.dateOfBirth);
      let age = now.getUTCFullYear() - birth.getUTCFullYear();
      const m = now.getUTCMonth() - birth.getUTCMonth();
      if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;

      if (data.role === 'teacher' && age < 18) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Teachers must be at least 18 years old',
          path: ['dateOfBirth'],
        });
      }
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    fcmToken: z.string().optional(),
  }).refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required to log in',
    path: ['email'],
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export const fcmTokenSchema = z.object({
  body: z.object({
    fcmToken: z.string().min(1, 'FCM token is required'),
  }),
});
