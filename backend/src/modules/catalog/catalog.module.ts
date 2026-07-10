import { Module } from '@nestjs/common';
import { MedicationService } from './application/medication.service';
import { MEDICATION_REPOSITORY } from './domain/medication.repository';
import { PrismaMedicationRepository } from './infrastructure/prisma-medication.repository';
import { MedicationController } from './presentation/medication.controller';

@Module({
  controllers: [MedicationController],
  providers: [
    MedicationService,
    {
      provide: MEDICATION_REPOSITORY,
      useClass: PrismaMedicationRepository,
    },
  ],
  exports: [MEDICATION_REPOSITORY, MedicationService],
})
export class CatalogModule {}
