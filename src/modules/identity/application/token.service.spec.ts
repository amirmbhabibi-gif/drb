import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../../infra/redis/redis.service';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { UserStatus } from '../domain/user-status.enum';
import { TokenService } from './token.service';

const makeUser = (): UserEntity =>
  new UserEntity({
    id: 'user-uuid-1',
    phone: '09121234567',
    fullName: null,
    role: UserRole.OWNER,
    status: UserStatus.PENDING_PROFILE,
    pharmacyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'del'>>;

  beforeEach(async () => {
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const map: Record<string, unknown> = {
                'jwt.accessSecret': 'test-access-secret-min-16-chars',
                'jwt.accessExpiry': '15m',
                'jwt.refreshSecret': 'test-refresh-secret-min-16-chars',
                'jwt.refreshExpiry': '7d',
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  it('issues access and refresh tokens', async () => {
    const pair = await service.issueTokenPair(makeUser());

    expect(pair.accessToken).toBe('access-token');
    expect(pair.refreshToken).toBe('refresh-token');
    expect(pair.expiresIn).toBe(900);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:refresh:user-uuid-1:/),
      '1',
      604800,
    );
  });

  it('validates access token and rejects blocklisted jti', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid-1',
      phone: '09121234567',
      role: UserRole.OWNER,
      jti: 'blocked-jti',
      type: 'access',
    });
    redis.get.mockResolvedValue('1');

    await expect(service.validateAccessToken('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid-1',
      jti: 'old-jti',
      type: 'refresh',
    });
    redis.get.mockResolvedValue('1');
    jwtService.signAsync
      .mockReset()
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');

    const pair = await service.refreshTokens('refresh-token', makeUser());

    expect(redis.del).toHaveBeenCalledWith('auth:refresh:user-uuid-1:old-jti');
    expect(pair.accessToken).toBe('new-access');
    expect(pair.refreshToken).toBe('new-refresh');
  });
});
