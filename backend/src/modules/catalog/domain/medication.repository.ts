import { PageResult } from '../../../common/dto/pagination.dto';
import { MedicationEntity } from './medication.entity';

export interface MedicationQueryFilters {
  q?: string;
}

export abstract class MedicationRepository {
  abstract findById(id: string): Promise<MedicationEntity | null>;

  abstract findMany(
    filters: MedicationQueryFilters,
    page: number,
    limit: number,
  ): Promise<PageResult<MedicationEntity>>;

  abstract findManyByIds(ids: string[]): Promise<MedicationEntity[]>;
}

export const MEDICATION_REPOSITORY = Symbol('MEDICATION_REPOSITORY');
