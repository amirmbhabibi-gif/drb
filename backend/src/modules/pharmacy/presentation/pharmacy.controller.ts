import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenPayload } from '../../identity/application/token.service';
import { CurrentUser } from '../../identity/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/guards/jwt-auth.guard';
import { PharmacyResponseDto, SubmitLicenseDto } from '../application/dto/pharmacy.dto';
import { PharmacyService } from '../application/pharmacy.service';

@ApiTags('Pharmacies')
@ApiBearerAuth()
@Controller('pharmacies')
@UseGuards(JwtAuthGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post('license')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit pharmacy profile and license document (پروانه)' })
  @ApiCreatedResponse({ type: PharmacyResponseDto })
  async submitLicense(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SubmitLicenseDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PharmacyResponseDto> {
    return this.pharmacyService.submitLicense(user.sub, dto, file);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user pharmacy profile' })
  @ApiOkResponse({ type: PharmacyResponseDto })
  async getMyPharmacy(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<PharmacyResponseDto | null> {
    return this.pharmacyService.getMyPharmacy(user.sub);
  }

  @Get(':id/license')
  @ApiOperation({ summary: 'Download license document (owner or admin)' })
  async downloadLicense(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<StreamableFile> {
    const { stream, mimeType, filename } = await this.pharmacyService.getPharmacyForDownload(
      id,
      user.sub,
      user.role,
    );
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `inline; filename="${filename}"`,
    });
  }
}
