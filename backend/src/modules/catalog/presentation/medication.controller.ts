import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageResult } from '../../../common/dto/pagination.dto';
import { MedicationService } from '../application/medication.service';
import { MedicationResponseDto } from '../application/dto/medication.response.dto';
import { QueryMedicationsDto } from '../application/dto/query-medications.dto';

@ApiTags('Medications')
@Controller('medications')
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  @Get()
  @ApiOperation({ summary: 'Search medications catalog' })
  @ApiOkResponse({ description: 'Paginated list of medications' })
  async list(@Query() query: QueryMedicationsDto): Promise<PageResult<MedicationResponseDto>> {
    return this.medicationService.getMedications(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medication by ID' })
  @ApiOkResponse({ type: MedicationResponseDto })
  async getById(@Param('id', new ParseUUIDPipe()) id: string): Promise<MedicationResponseDto> {
    return this.medicationService.getMedicationById(id);
  }
}
