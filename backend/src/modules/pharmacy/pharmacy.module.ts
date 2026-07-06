import { forwardRef, Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { IdentityModule } from '../identity/identity.module';
import { PharmacyService } from './application/pharmacy.service';
import { PHARMACY_REPOSITORY } from './domain/pharmacy.repository';
import { PrismaPharmacyRepository } from './infrastructure/prisma-pharmacy.repository';
import { AdminPharmacyController } from './presentation/admin-pharmacy.controller';
import { PharmacyController } from './presentation/pharmacy.controller';

@Module({
  imports: [forwardRef(() => IdentityModule), StorageModule],
  controllers: [PharmacyController, AdminPharmacyController],
  providers: [
    PharmacyService,
    {
      provide: PHARMACY_REPOSITORY,
      useClass: PrismaPharmacyRepository,
    },
  ],
  exports: [PharmacyService, PHARMACY_REPOSITORY],
})
export class PharmacyModule {}
