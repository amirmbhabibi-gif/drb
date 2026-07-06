process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3001';
process.env.API_PREFIX = process.env.API_PREFIX ?? 'api/v1';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://darugard:darugard_secret@localhost:5433/darugard?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://:redis_secret@localhost:6379';
process.env.IRANPAYAMAK_API_KEY = process.env.IRANPAYAMAK_API_KEY ?? 'test-api-key';
process.env.IRANPAYAMAK_BASE_URL =
  process.env.IRANPAYAMAK_BASE_URL ?? 'https://api.iranpayamak.com';
process.env.IRANPAYAMAK_LINE_NUMBER = process.env.IRANPAYAMAK_LINE_NUMBER ?? '5000000000000';
process.env.IRANPAYAMAK_OTP_PATTERN_CODE =
  process.env.IRANPAYAMAK_OTP_PATTERN_CODE ?? 'TEST_PATTERN';
process.env.IRANPAYAMAK_OTP_PATTERN_VAR = process.env.IRANPAYAMAK_OTP_PATTERN_VAR ?? 'code';
process.env.IRANPAYAMAK_NUMBER_FORMAT = process.env.IRANPAYAMAK_NUMBER_FORMAT ?? 'english';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-min-16-chars';
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY ?? '15m';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-min-16-chars';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';
process.env.ADMIN_PHONES = process.env.ADMIN_PHONES ?? '';
process.env.ADMIN_STATIC_OTPS = process.env.ADMIN_STATIC_OTPS ?? '';
process.env.TEST_STATIC_OTPS = process.env.TEST_STATIC_OTPS ?? '';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
process.env.LICENSE_MAX_SIZE_MB = process.env.LICENSE_MAX_SIZE_MB ?? '5';
process.env.LICENSE_ALLOWED_MIME =
  process.env.LICENSE_ALLOWED_MIME ?? 'image/jpeg,image/png,application/pdf';
