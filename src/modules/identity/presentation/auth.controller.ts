import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import {
  AuthTokensResponseDto,
  OtpRequestResponseDto,
  UserResponseDto,
} from '../application/dto/auth.response.dto';
import { RefreshTokenDto, RefreshTokenRequiredDto } from '../application/dto/refresh-token.dto';
import { RequestOtpDto } from '../application/dto/request-otp.dto';
import { VerifyOtpDto } from '../application/dto/verify-otp.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessTokenPayload } from '../application/token.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request OTP for phone login',
    description:
      'Sends a one-time password via SMS. Returns the same response whether the phone is registered or not.',
  })
  @ApiOkResponse({ type: OtpRequestResponseDto })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<OtpRequestResponseDto> {
    return this.authService.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and obtain JWT tokens',
    description: 'Validates the OTP code. Creates a new user on first successful verification.',
  })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthTokensResponseDto> {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  async refresh(@Body() dto: RefreshTokenRequiredDto): Promise<AuthTokensResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(user, dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async me(@CurrentUser() user: AccessTokenPayload): Promise<UserResponseDto> {
    return this.authService.getMe(user.sub);
  }
}
