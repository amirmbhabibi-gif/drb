import { createHash, randomInt } from 'crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';
import { assertIranianMobile, toWesternDigits } from '../../../common/phone/iranian-phone';
import { RedisService } from '../../../infra/redis/redis.service';
import { IranPayamakClient } from '../../../infra/sms/iranpayamak.client';

interface OtpRecord {
  codeHash: string;
  attempts: number;
  createdAt: string;
}

const OTP_KEY_PREFIX = 'otp:';
const OTP_COOLDOWN_PREFIX = 'otp:cooldown:';
const OTP_RATE_PREFIX = 'otp:rate:';
const RATE_WINDOW_SECONDS = 3600;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly length: number;
  private readonly ttlSeconds: number;
  private readonly resendCooldownSeconds: number;
  private readonly maxAttempts: number;
  private readonly maxRequestsPerHour: number;
  private readonly staticOtpPhones: Set<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly smsClient: IranPayamakClient,
  ) {
    this.length = this.configService.get<number>('otp.length', 6);
    this.ttlSeconds = this.configService.get<number>('otp.ttlSeconds', 120);
    this.resendCooldownSeconds = this.configService.get<number>('otp.resendCooldownSeconds', 60);
    this.maxAttempts = this.configService.get<number>('otp.maxAttempts', 5);
    this.maxRequestsPerHour = this.configService.get<number>('otp.maxRequestsPerHour', 5);

    const adminStaticOtps = this.configService.get<Record<string, string>>('admin.staticOtps', {});
    const testStaticOtps = this.configService.get<Record<string, string>>('otp.testStaticOtps', {});
    this.staticOtpPhones = new Set(
      [...Object.keys(adminStaticOtps), ...Object.keys(testStaticOtps)].map((phone) =>
        assertIranianMobile(phone),
      ),
    );
  }

  getExpiresIn(): number {
    return this.ttlSeconds;
  }

  async issue(rawPhone: string): Promise<void> {
    const phone = assertIranianMobile(rawPhone);

    if (this.staticOtpPhones.has(phone)) {
      this.logger.log(`Skipping SMS provider OTP for static login phone ${phone}`);
      return;
    }

    await this.assertCanRequest(phone);

    const code = this.generateCode();
    const record: OtpRecord = {
      codeHash: this.hashCode(code),
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await this.redis.set(`${OTP_KEY_PREFIX}${phone}`, JSON.stringify(record), this.ttlSeconds);
    await this.redis.set(`${OTP_COOLDOWN_PREFIX}${phone}`, '1', this.resendCooldownSeconds);
    await this.incrementHourlyRate(phone);

    await this.smsClient.sendOtp(phone, code, Math.ceil(this.ttlSeconds / 60));
    this.logger.log(`OTP issued for ${phone}`);
  }

  async verify(rawPhone: string, code: string): Promise<void> {
    const phone = assertIranianMobile(rawPhone);
    const normalizedCode = toWesternDigits(code);
    const key = `${OTP_KEY_PREFIX}${phone}`;
    const raw = await this.redis.get(key);

    if (!raw) {
      throw new AppException(
        'OTP_EXPIRED',
        HttpStatus.BAD_REQUEST,
        'OTP has expired or was not requested',
      );
    }

    const record = JSON.parse(raw) as OtpRecord;

    if (record.attempts >= this.maxAttempts) {
      await this.redis.del(key);
      throw new AppException(
        'OTP_MAX_ATTEMPTS',
        HttpStatus.TOO_MANY_REQUESTS,
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    const codeHash = this.hashCode(normalizedCode);
    if (codeHash !== record.codeHash) {
      record.attempts += 1;
      const remainingTtl = await this.redis.ttl(key);
      const ttl = remainingTtl > 0 ? remainingTtl : this.ttlSeconds;
      await this.redis.set(key, JSON.stringify(record), ttl);
      throw new AppException('OTP_INVALID', HttpStatus.BAD_REQUEST, 'Invalid OTP code');
    }

    await this.redis.del(key);
  }

  private async assertCanRequest(phone: string): Promise<void> {
    const cooldown = await this.redis.get(`${OTP_COOLDOWN_PREFIX}${phone}`);
    if (cooldown) {
      throw new AppException(
        'OTP_COOLDOWN',
        HttpStatus.TOO_MANY_REQUESTS,
        'Please wait before requesting another OTP',
      );
    }

    const rateKey = `${OTP_RATE_PREFIX}${phone}`;
    const countRaw = await this.redis.get(rateKey);
    const count = countRaw ? parseInt(countRaw, 10) : 0;

    if (count >= this.maxRequestsPerHour) {
      throw new AppException(
        'OTP_RATE_LIMIT',
        HttpStatus.TOO_MANY_REQUESTS,
        'Too many OTP requests. Please try again later.',
      );
    }
  }

  private async incrementHourlyRate(phone: string): Promise<void> {
    const rateKey = `${OTP_RATE_PREFIX}${phone}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) {
      await this.redis.expire(rateKey, RATE_WINDOW_SECONDS);
    }
  }

  private generateCode(): string {
    const max = 10 ** this.length;
    const num = randomInt(0, max);
    return num.toString().padStart(this.length, '0');
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
