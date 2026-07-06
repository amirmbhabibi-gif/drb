import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().default('api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),

  // FarazSMS / IranPayamak
  IRANPAYAMAK_API_KEY: z.string().min(1),
  IRANPAYAMAK_BASE_URL: z.string().url().default('https://api.iranpayamak.com'),
  IRANPAYAMAK_LINE_NUMBER: z
    .string()
    .regex(/^[0-9]+$/, 'IRANPAYAMAK_LINE_NUMBER must be digits only'),
  IRANPAYAMAK_OTP_PATTERN_CODE: z.string().min(1),
  IRANPAYAMAK_OTP_PATTERN_VAR: z.string().min(1).default('code'),
  IRANPAYAMAK_OTP_PATTERN_EXPIRY_VAR: z.string().min(1).default('expiry'),
  IRANPAYAMAK_NUMBER_FORMAT: z.enum(['english', 'persian', 'en', 'fa']).default('english'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // OTP behaviour
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().min(30).max(600).default(120),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(300).default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_MAX_REQUESTS_PER_HOUR: z.coerce.number().int().min(1).max(20).default(5),

  // Admin bootstrap
  ADMIN_PHONES: z.string().default(''),
  // Comma-separated phone:staticCode pairs (no SMS OTP; verify directly with static code)
  ADMIN_STATIC_OTPS: z.string().default(''),
  // Comma-separated phone:staticCode pairs for non-admin test accounts (no SMS OTP)
  TEST_STATIC_OTPS: z.string().default(''),

  // File uploads
  UPLOAD_DIR: z.string().default('./uploads'),
  LICENSE_MAX_SIZE_MB: z.coerce.number().int().min(1).max(50).default(5),
  LICENSE_ALLOWED_MIME: z
    .string()
    .default('image/jpeg,image/png,application/pdf'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  [${e.path.join('.')}] ${e.message}`)
      .join('\n');
    throw new Error(`❌ Environment validation failed:\n${formatted}\n`);
  }

  return result.data;
}
