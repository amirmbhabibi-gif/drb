import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PageResult } from '../../../common/dto/pagination.dto';
import { MEDICATION_REPOSITORY, MedicationRepository } from '../domain/medication.repository';
import { MedicationResponseDto } from './dto/medication.response.dto';
import { QueryMedicationsDto } from './dto/query-medications.dto';

@Injectable()
export class MedicationService {
  constructor(
    @Inject(MEDICATION_REPOSITORY)
    private readonly medicationRepository: MedicationRepository,
  ) {}

  async getMedicationById(id: string): Promise<MedicationResponseDto> {
    const medication = await this.medicationRepository.findById(id);

    if (!medication || medication.isDeleted()) {
      throw new NotFoundException(`Medication ${id} not found`);
    }

    return MedicationResponseDto.fromEntity(medication);
  }

  async getMedications(query: QueryMedicationsDto): Promise<PageResult<MedicationResponseDto>> {
    const result = await this.medicationRepository.findMany(
      { q: query.q },
      query.page,
      query.limit,
    );

    return {
      items: result.items.map(MedicationResponseDto.fromEntity),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
