import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../identity/domain/user-role.enum';
import { AccessTokenPayload } from '../../identity/application/token.service';
import { CurrentUser } from '../../identity/presentation/decorators/current-user.decorator';
import { Roles } from '../../identity/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/presentation/guards/roles.guard';
import { PharmacyVerificationStatus } from '../domain/pharmacy-verification-status.enum';
import {
  AdminPharmacyResponseDto,
  PharmacyResponseDto,
  RejectPharmacyDto,
} from '../application/dto/pharmacy.dto';
import { PharmacyService } from '../application/pharmacy.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/pharmacies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get()
  @ApiOperation({ summary: 'List pharmacies for admin review' })
  @ApiQuery({
    name: 'status',
    enum: [...Object.values(PharmacyVerificationStatus), 'ALL'],
    required: false,
  })
  @ApiOkResponse({ type: [AdminPharmacyResponseDto] })
  async list(
    @Query('status') status?: PharmacyVerificationStatus | 'ALL',
  ): Promise<AdminPharmacyResponseDto[]> {
    return this.pharmacyService.listForAdmin(status ?? 'ALL');
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Approve pharmacy license and activate users' })
  @ApiOkResponse({ type: PharmacyResponseDto })
  async verify(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() admin: AccessTokenPayload,
  ): Promise<PharmacyResponseDto> {
    return this.pharmacyService.verifyPharmacy(id, admin.sub);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject pharmacy license with reason' })
  @ApiOkResponse({ type: PharmacyResponseDto })
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() admin: AccessTokenPayload,
    @Body() dto: RejectPharmacyDto,
  ): Promise<PharmacyResponseDto> {
    return this.pharmacyService.rejectPharmacy(id, admin.sub, dto.reason);
  }
}
