import { timingSafeEqual } from 'crypto';
import { HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';
import { assertIranianMobile, toWesternDigits } from '../../../common/phone/iranian-phone';
import { PHARMACY_REPOSITORY, PharmacyRepository } from '../../pharmacy/domain/pharmacy.repository';
import { UserRole } from '../domain/user-role.enum';
import { UserStatus } from '../domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../domain/user.repository';
import { OtpService } from './otp.service';
import { AccessTokenPayload, TokenService } from './token.service';
import {
  AuthTokensResponseDto,
  OtpRequestResponseDto,
  UserResponseDto,
} from './dto/auth.response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminPhones: Set<string>;
  private readonly adminStaticOtps: Map<string, string>;
  private readonly testStaticOtps: Map<string, string>;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PHARMACY_REPOSITORY)
    private readonly pharmacyRepository: PharmacyRepository,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    const phones = configService.get<string[]>('admin.phones', []);
    this.adminPhones = new Set(phones.map((p) => assertIranianMobile(p)));

    const staticOtps = configService.get<Record<string, string>>('admin.staticOtps', {});
    this.adminStaticOtps = new Map(
      Object.entries(staticOtps).map(([phone, otp]) => [assertIranianMobile(phone), otp]),
    );

    const testStaticOtps = configService.get<Record<string, string>>('otp.testStaticOtps', {});
    this.testStaticOtps = new Map(
      Object.entries(testStaticOtps).map(([phone, otp]) => [assertIranianMobile(phone), otp]),
    );
  }

  async requestOtp(rawPhone: string): Promise<OtpRequestResponseDto> {
    const phone = assertIranianMobile(rawPhone);

    if (this.hasStaticOtp(phone)) {
      this.logger.log(`Skipping SMS OTP for static login phone ${phone}`);
      return { expiresIn: this.otpService.getExpiresIn() };
    }

    await this.otpService.issue(phone);
    return { expiresIn: this.otpService.getExpiresIn() };
  }

  async verifyOtp(rawPhone: string, code: string): Promise<AuthTokensResponseDto> {
    const phone = assertIranianMobile(rawPhone);
    const normalizedCode = toWesternDigits(code);
    const staticCode = this.getStaticOtpCode(phone);

    if (staticCode) {
      if (!this.matchesStaticCode(normalizedCode, staticCode)) {
        throw new AppException('OTP_INVALID', HttpStatus.BAD_REQUEST, 'Invalid OTP code');
      }
    } else {
      await this.otpService.verify(phone, normalizedCode);
    }

    const isAdmin = this.isAdminPhone(phone);
    let user = await this.userRepository.findByPhone(phone);

    if (!user) {
      user = await this.userRepository.create({
        phone,
        role: isAdmin ? UserRole.ADMIN : UserRole.OWNER,
        status: isAdmin ? UserStatus.ACTIVE : UserStatus.PENDING_PROFILE,
      });
      this.logger.log(`New user registered via OTP: ${user.id} (${phone})`);
    } else if (isAdmin && user.role !== UserRole.ADMIN) {
      user = await this.userRepository.update(user.id, {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
    }

    if (user.isSuspended()) {
      throw new UnauthorizedException('Account is suspended');
    }

    const tokens = await this.tokenService.issueTokenPair(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: await this.toUserResponse(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.isDeleted()) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isSuspended()) {
      throw new UnauthorizedException('Account is suspended');
    }

    const tokens = await this.tokenService.refreshTokens(refreshToken, user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: await this.toUserResponse(user),
    };
  }

  async logout(accessPayload: AccessTokenPayload, refreshToken?: string): Promise<void> {
    let refreshJti: string | undefined;
    if (refreshToken) {
      try {
        const refreshPayload = await this.tokenService.verifyRefreshToken(refreshToken);
        refreshJti = refreshPayload.jti;
      } catch {
        // Refresh token may already be invalid; still blocklist access token
      }
    }

    await this.tokenService.logout(accessPayload.jti, accessPayload.sub, refreshJti);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.isDeleted()) {
      throw new UnauthorizedException('User not found');
    }
    return this.toUserResponse(user);
  }

  private async toUserResponse(user: import('../domain/user.entity').UserEntity): Promise<UserResponseDto> {
    const dto = UserResponseDto.fromEntity(user);

    if (user.pharmacyId) {
      const pharmacy = await this.pharmacyRepository.findById(user.pharmacyId);
      if (pharmacy) {
        dto.pharmacyName = pharmacy.name;
        dto.pharmacyVerificationStatus = pharmacy.verificationStatus;
        dto.rejectionReason = pharmacy.rejectionReason;
      }
    }

    return dto;
  }

  private isAdminPhone(phone: string): boolean {
    return this.adminPhones.has(phone) || this.adminStaticOtps.has(phone);
  }

  private hasStaticOtp(phone: string): boolean {
    return this.adminStaticOtps.has(phone) || this.testStaticOtps.has(phone);
  }

  private getStaticOtpCode(phone: string): string | undefined {
    return this.adminStaticOtps.get(phone) ?? this.testStaticOtps.get(phone);
  }

  private matchesStaticCode(provided: string, expected: string): boolean {
    if (provided.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  }
}
