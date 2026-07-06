import { registerAs } from '@nestjs/config';
import { Env } from './env.validation';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV as Env['NODE_ENV'],
  port: Number(process.env.PORT),
  apiPrefix: process.env.API_PREFIX as string,
  corsOrigin: process.env.CORS_ORIGIN as string,
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL as string,
}));

export const iranpayamakConfig = registerAs('iranpayamak', () => ({
  apiKey: process.env.IRANPAYAMAK_API_KEY as string,
  baseUrl: process.env.IRANPAYAMAK_BASE_URL ?? 'https://api.iranpayamak.com',
  lineNumber: process.env.IRANPAYAMAK_LINE_NUMBER as string,
  otpPatternCode: process.env.IRANPAYAMAK_OTP_PATTERN_CODE as string,
  otpPatternVar: process.env.IRANPAYAMAK_OTP_PATTERN_VAR ?? 'code',
  otpPatternExpiryVar: process.env.IRANPAYAMAK_OTP_PATTERN_EXPIRY_VAR ?? 'expiry',
  numberFormat: process.env.IRANPAYAMAK_NUMBER_FORMAT ?? 'english',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET as string,
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
}));

function parsePhoneOtpPairs(raw: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const entry of raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)) {
    const separator = entry.indexOf(':');
    if (separator === -1) {
      continue;
    }

    const phone = entry.slice(0, separator).trim();
    const code = entry.slice(separator + 1).trim();
    if (phone && code) {
      result[phone] = code;
    }
  }

  return result;
}

export const otpConfig = registerAs('otp', () => ({
  length: Number(process.env.OTP_LENGTH ?? 6),
  ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 120),
  resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
  maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  maxRequestsPerHour: Number(process.env.OTP_MAX_REQUESTS_PER_HOUR ?? 5),
  testStaticOtps: parsePhoneOtpPairs(process.env.TEST_STATIC_OTPS ?? ''),
}));

function parseAdminStaticOtps(raw: string): Record<string, string> {
  return parsePhoneOtpPairs(raw);
}

export const adminConfig = registerAs('admin', () => ({
  phones: (process.env.ADMIN_PHONES ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean),
  staticOtps: parseAdminStaticOtps(process.env.ADMIN_STATIC_OTPS ?? ''),
}));

export const uploadConfig = registerAs('upload', () => ({
  dir: process.env.UPLOAD_DIR ?? './uploads',
  licenseMaxSizeMb: Number(process.env.LICENSE_MAX_SIZE_MB ?? 5),
  licenseAllowedMime: (process.env.LICENSE_ALLOWED_MIME ??
    'image/jpeg,image/png,application/pdf')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
}));
