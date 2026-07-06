import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { AppException } from '../../../common/exceptions/app.exception';
import { RedisService } from '../../../infra/redis/redis.service';
import { IranPayamakClient } from '../../../infra/sms/iranpayamak.client';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'del' | 'incr' | 'expire' | 'ttl'>>;
  let smsClient: jest.Mocked<Pick<IranPayamakClient, 'sendOtp'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    };
    smsClient = { sendOtp: jest.fn().mockResolvedValue(12345) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const map: Record<string, unknown> = {
                'otp.length': 6,
                'otp.ttlSeconds': 120,
                'otp.resendCooldownSeconds': 60,
                'otp.maxAttempts': 5,
                'otp.maxRequestsPerHour': 5,
                'admin.staticOtps': {},
                'otp.testStaticOtps': {},
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
        { provide: RedisService, useValue: redis },
        { provide: IranPayamakClient, useValue: smsClient },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  it('issues OTP and sends SMS', async () => {
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);

    await service.issue('09121234567');

    expect(smsClient.sendOtp).toHaveBeenCalledWith('09121234567', expect.stringMatching(/^\d{6}$/), 2);
    expect(redis.set).toHaveBeenCalledWith('otp:09121234567', expect.any(String), 120);
    expect(redis.set).toHaveBeenCalledWith('otp:cooldown:09121234567', '1', 60);
  });

  it('rejects request during cooldown', async () => {
    redis.get.mockImplementation(async (key: string) => (key.includes('cooldown') ? '1' : null));

    await expect(service.issue('09121234567')).rejects.toBeInstanceOf(AppException);
    expect(smsClient.sendOtp).not.toHaveBeenCalled();
  });

  it('skips SMS provider for static login phones', async () => {
    const adminModule: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const map: Record<string, unknown> = {
                'otp.length': 6,
                'otp.ttlSeconds': 120,
                'otp.resendCooldownSeconds': 60,
                'otp.maxAttempts': 5,
                'otp.maxRequestsPerHour': 5,
                'admin.staticOtps': { '09233283893': '138421' },
                'otp.testStaticOtps': { '09944902951': '123456' },
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
        { provide: RedisService, useValue: redis },
        { provide: IranPayamakClient, useValue: smsClient },
      ],
    }).compile();

    const adminService = adminModule.get(OtpService);

    await adminService.issue('09233283893');
    await adminService.issue('09944902951');

    expect(smsClient.sendOtp).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('verifies valid OTP and deletes record', async () => {
    const code = '123456';
    const record = {
      codeHash: createHash('sha256').update(code).digest('hex'),
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    redis.get.mockResolvedValue(JSON.stringify(record));

    await expect(service.verify('09121234567', code)).resolves.toBeUndefined();
    expect(redis.del).toHaveBeenCalledWith('otp:09121234567');
  });

  it('rejects invalid OTP and increments attempts', async () => {
    const record = {
      codeHash: createHash('sha256').update('000000').digest('hex'),
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    redis.get.mockResolvedValue(JSON.stringify(record));
    redis.ttl.mockResolvedValue(90);

    await expect(service.verify('09121234567', '111111')).rejects.toBeInstanceOf(AppException);
    expect(redis.set).toHaveBeenCalledWith(
      'otp:09121234567',
      expect.stringContaining('"attempts":1'),
      90,
    );
  });

  it('rejects expired OTP', async () => {
    redis.get.mockResolvedValue(null);

    await expect(service.verify('09121234567', '123456')).rejects.toBeInstanceOf(AppException);
  });
});
