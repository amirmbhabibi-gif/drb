import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { UserStatus } from '../domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../domain/user.repository';
import {
  PHARMACY_REPOSITORY,
  PharmacyRepository,
} from '../../pharmacy/domain/pharmacy.repository';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let pharmacyRepository: jest.Mocked<Pick<PharmacyRepository, 'findById'>>;
  let otpService: jest.Mocked<Pick<OtpService, 'issue' | 'verify' | 'getExpiresIn'>>;
  let tokenService: jest.Mocked<
    Pick<TokenService, 'issueTokenPair' | 'verifyRefreshToken' | 'refreshTokens' | 'logout'>
  >;
  let configGet: jest.Mock;

  const existingUser = new UserEntity({
    id: 'user-1',
    phone: '09121234567',
    fullName: null,
    role: UserRole.OWNER,
    status: UserStatus.PENDING_PROFILE,
    pharmacyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(async () => {
    userRepository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findManyByPharmacy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    pharmacyRepository = {
      findById: jest.fn(),
    };
    otpService = {
      issue: jest.fn().mockResolvedValue(undefined),
      verify: jest.fn().mockResolvedValue(undefined),
      getExpiresIn: jest.fn().mockReturnValue(120),
    };
    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
        accessJti: 'a-jti',
        refreshJti: 'r-jti',
      }),
      verifyRefreshToken: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    configGet = jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'admin.phones') {
        return [];
      }
      if (key === 'admin.staticOtps') {
        return {};
      }
      if (key === 'otp.testStaticOtps') {
        return {};
      }
      return defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: PHARMACY_REPOSITORY, useValue: pharmacyRepository },
        { provide: OtpService, useValue: otpService },
        { provide: TokenService, useValue: tokenService },
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('requests OTP and returns expiry', async () => {
    const result = await service.requestOtp('09121234567');
    expect(otpService.issue).toHaveBeenCalledWith('09121234567');
    expect(result.expiresIn).toBe(120);
  });

  it('verifies OTP for existing user and returns tokens', async () => {
    userRepository.findByPhone.mockResolvedValue(existingUser);

    const result = await service.verifyOtp('09121234567', '123456');

    expect(otpService.verify).toHaveBeenCalledWith('09121234567', '123456');
    expect(tokenService.issueTokenPair).toHaveBeenCalledWith(existingUser);
    expect(result.accessToken).toBe('access');
    expect(result.user.id).toBe('user-1');
  });

  it('creates user on first successful OTP verify', async () => {
    userRepository.findByPhone.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(existingUser);

    await service.verifyOtp('09121234567', '123456');

    expect(userRepository.create).toHaveBeenCalledWith({
      phone: '09121234567',
      role: UserRole.OWNER,
      status: UserStatus.PENDING_PROFILE,
    });
  });

  describe('admin static OTP', () => {
    const adminPhone = '09233283893';
    const adminCode = '138421';

    beforeEach(() => {
      configGet.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'admin.phones') {
          return [];
        }
        if (key === 'admin.staticOtps') {
          return { [adminPhone]: adminCode };
        }
        if (key === 'otp.testStaticOtps') {
          return {};
        }
        return defaultValue;
      });

      const moduleRef = Test.createTestingModule({
        providers: [
          AuthService,
          { provide: USER_REPOSITORY, useValue: userRepository },
          { provide: PHARMACY_REPOSITORY, useValue: pharmacyRepository },
          { provide: OtpService, useValue: otpService },
          { provide: TokenService, useValue: tokenService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      });

      return moduleRef.compile().then((module) => {
        service = module.get(AuthService);
      });
    });

    it('skips OTP issue for admin static login phones', async () => {
      const result = await service.requestOtp(adminPhone);

      expect(otpService.issue).not.toHaveBeenCalled();
      expect(result.expiresIn).toBe(120);
    });

    it('verifies admin static code without Redis OTP', async () => {
      userRepository.findByPhone.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(
        new UserEntity({
          ...existingUser,
          phone: adminPhone,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        }),
      );

      await service.verifyOtp(adminPhone, adminCode);

      expect(otpService.verify).not.toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalledWith({
        phone: adminPhone,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
    });

    it('rejects invalid admin static code', async () => {
      await expect(service.verifyOtp(adminPhone, '000000')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      });
      expect(otpService.verify).not.toHaveBeenCalled();
    });
  });

  describe('test static OTP', () => {
    const testPhone = '09944902951';
    const testCode = '123456';

    beforeEach(() => {
      configGet.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'admin.phones') {
          return [];
        }
        if (key === 'admin.staticOtps') {
          return {};
        }
        if (key === 'otp.testStaticOtps') {
          return { [testPhone]: testCode };
        }
        return defaultValue;
      });

      const moduleRef = Test.createTestingModule({
        providers: [
          AuthService,
          { provide: USER_REPOSITORY, useValue: userRepository },
          { provide: PHARMACY_REPOSITORY, useValue: pharmacyRepository },
          { provide: OtpService, useValue: otpService },
          { provide: TokenService, useValue: tokenService },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      });

      return moduleRef.compile().then((module) => {
        service = module.get(AuthService);
      });
    });

    it('skips OTP issue for test static login phones', async () => {
      const result = await service.requestOtp(testPhone);

      expect(otpService.issue).not.toHaveBeenCalled();
      expect(result.expiresIn).toBe(120);
    });

    it('creates regular pharmacy owner for test static code', async () => {
      userRepository.findByPhone.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(
        new UserEntity({
          ...existingUser,
          phone: testPhone,
          role: UserRole.OWNER,
          status: UserStatus.PENDING_PROFILE,
        }),
      );

      await service.verifyOtp(testPhone, testCode);

      expect(otpService.verify).not.toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalledWith({
        phone: testPhone,
        role: UserRole.OWNER,
        status: UserStatus.PENDING_PROFILE,
      });
    });
  });
});
