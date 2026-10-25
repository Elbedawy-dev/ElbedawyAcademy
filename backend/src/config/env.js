import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const bool = (def) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return def;
      if (typeof v === 'boolean') return v;
      return ['true', '1', 'yes', 'on'].includes(v.toLowerCase());
    });

const optionalString = z.string().optional().default('');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  APP_NAME: z.string().default('Elbedawy Academy'),
  APP_URL: z.string().url().default('http://localhost:5000'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('*'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),

  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/elbedawy_academy'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),

  RATE_LIMIT_WINDOW_MIN: z.coerce.number().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_FOLDER: z.string().default('elbedawy-academy'),

  FIREBASE_PROJECT_ID: optionalString,
  FIREBASE_CLIENT_EMAIL: optionalString,
  FIREBASE_PRIVATE_KEY: optionalString,

  LIVE_PROVIDER: z.enum(['agora']).default('agora'),
  AGORA_APP_ID: optionalString,
  AGORA_APP_CERTIFICATE: optionalString,
  AGORA_CUSTOMER_ID: optionalString,
  AGORA_CUSTOMER_SECRET: optionalString,
  AGORA_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  PAYMOB_BASE_URL: z.string().url().default('https://accept.paymob.com/api'),
  PAYMOB_API_KEY: optionalString,
  PAYMOB_HMAC_SECRET: optionalString,
  PAYMOB_CARD_INTEGRATION_ID: optionalString,
  PAYMOB_WALLET_INTEGRATION_ID: optionalString,
  PAYMOB_IFRAME_ID: optionalString,
  PAYMENT_RETURN_URL: z.string().url().default('http://localhost:3000/payments/result'),

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  EMAIL_FROM: z.string().default('Elbedawy Academy <no-reply@elbedawy-academy.com>'),

  SMS_PROVIDER: z.enum(['console', 'custom']).default('console'),

  ENABLE_CRON: bool(true),
  PDF_FONT_PATH: optionalString,
  ALLOW_MOCK_PAYMENTS: bool(false),
  ALLOW_MOCK_LIVE: bool(false),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Logger is not available yet (it depends on this module), so write directly to stderr.
  process.stderr.write(`Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const raw = parsed.data;

if (raw.NODE_ENV === 'production') {
  const prodErrors = [];
  if (!raw.PAYMOB_HMAC_SECRET || raw.PAYMOB_HMAC_SECRET.trim() === '') {
    prodErrors.push('PAYMOB_HMAC_SECRET is required and cannot be empty in production');
  }
  if (raw.CORS_ORIGINS.trim() === '*') {
    prodErrors.push('CORS_ORIGINS cannot be \"*\" in production');
  }
  if (
    raw.JWT_ACCESS_SECRET.includes('change_me') ||
    raw.JWT_ACCESS_SECRET === 'change_me_access_secret_at_least_32_chars_long'
  ) {
    prodErrors.push('JWT_ACCESS_SECRET must not use the example placeholder in production');
  }
  if (
    raw.JWT_REFRESH_SECRET.includes('change_me') ||
    raw.JWT_REFRESH_SECRET === 'change_me_refresh_secret_at_least_32_chars_long'
  ) {
    prodErrors.push('JWT_REFRESH_SECRET must not use the example placeholder in production');
  }
  if (
    raw.ENCRYPTION_KEY === '0'.repeat(64) ||
    raw.ENCRYPTION_KEY === '0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    prodErrors.push('ENCRYPTION_KEY must not use the example all-zeros placeholder in production');
  }

  if (prodErrors.length > 0) {
    const errorDetails = prodErrors.map((e) => `  - ${e}`).join('\n');
    process.stderr.write(`Production configuration safety violation:\n${errorDetails}\n`);
    process.exit(1);
  }
}

export const env = Object.freeze({
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDevelopment: raw.NODE_ENV === 'development',
  corsOrigins:
    raw.CORS_ORIGINS.trim() === '*'
      ? '*'
      : raw.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean),
  API_PREFIX: '/api/v1',
});

export default env;

