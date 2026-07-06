import { randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../../infra/redis/redis.service';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

export interface AccessTokenPayload {
  sub: string;
  phone: string;
  role: UserRole;
  jti: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accessJti: string;
  refreshJti: string;
}

const REFRESH_KEY_PREFIX = 'auth:refresh:';
const BLOCKLIST_KEY_PREFIX = 'auth:blocklist:';

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.accessSecret = this.configService.get<string>('jwt.accessSecret') as string;
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret') as string;
    const accessExpiry = this.configService.get<string>('jwt.accessExpiry', '15m');
    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry', '7d');
    this.accessExpiresInSeconds = parseExpiryToSeconds(accessExpiry);
    this.refreshExpiresInSeconds = parseExpiryToSeconds(refreshExpiry);
  }

  getAccessExpiresInSeconds(): number {
    return this.accessExpiresInSeconds;
  }

  async issueTokenPair(user: UserEntity): Promise<TokenPair> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        phone: user.phone,
        role: user.role,
        jti: accessJti,
        type: 'access',
      } satisfies AccessTokenPayload,
      { secret: this.accessSecret, expiresIn: this.accessExpiresInSeconds },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        jti: refreshJti,
        type: 'refresh',
      } satisfies RefreshTokenPayload,
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresInSeconds },
    );

    await this.storeRefreshToken(user.id, refreshJti);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresInSeconds,
      accessJti,
      refreshJti,
    };
  }

  async refreshTokens(refreshToken: string, user: UserEntity): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.revokeRefreshToken(payload.sub, payload.jti);
    return this.issueTokenPair(user);
  }

  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.redis.get(`${REFRESH_KEY_PREFIX}${payload.sub}:${payload.jti}`);
    if (!stored) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return payload;
  }

  async validateAccessToken(token: string): Promise<AccessTokenPayload> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const blocked = await this.redis.get(`${BLOCKLIST_KEY_PREFIX}${payload.jti}`);
    if (blocked) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    return payload;
  }

  async logout(accessJti: string, userId: string, refreshJti?: string): Promise<void> {
    await this.redis.set(`${BLOCKLIST_KEY_PREFIX}${accessJti}`, '1', this.accessExpiresInSeconds);

    if (refreshJti) {
      await this.revokeRefreshToken(userId, refreshJti);
    }
  }

  async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    await this.redis.del(`${REFRESH_KEY_PREFIX}${userId}:${jti}`);
  }

  private async storeRefreshToken(userId: string, jti: string): Promise<void> {
    await this.redis.set(
      `${REFRESH_KEY_PREFIX}${userId}:${jti}`,
      '1',
      this.refreshExpiresInSeconds,
    );
  }
}

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 900;
  }
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}
