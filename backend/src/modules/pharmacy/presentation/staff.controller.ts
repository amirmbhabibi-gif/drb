import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenPayload } from '../../identity/application/token.service';
import { CurrentUser } from '../../identity/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/guards/jwt-auth.guard';
import { CreateStaffDto, StaffResponseDto } from '../application/dto/staff.dto';
import { StaffService } from '../application/staff.service';

@ApiTags('Pharmacy Staff')
@ApiBearerAuth()
@Controller('pharmacies/staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create a staff account for the pharmacy (owner only)' })
  @ApiCreatedResponse({ type: StaffResponseDto })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffResponseDto> {
    return this.staffService.createStaff(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pharmacy staff members (owner only)' })
  @ApiOkResponse({ type: [StaffResponseDto] })
  async list(@CurrentUser() user: AccessTokenPayload): Promise<StaffResponseDto[]> {
    return this.staffService.listStaff(user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a staff member (owner only)' })
  async deactivate(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.staffService.deactivateStaff(user.sub, id);
  }
}
