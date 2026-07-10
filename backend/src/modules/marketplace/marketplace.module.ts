import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { ListingService } from './application/listing.service';
import { LISTING_REPOSITORY } from './domain/listing.repository';
import { PrismaListingRepository } from './infrastructure/prisma-listing.repository';
import { ListingController } from './presentation/listing.controller';

@Module({
  imports: [IdentityModule, CatalogModule],
  controllers: [ListingController],
  providers: [
    ListingService,
    {
      provide: LISTING_REPOSITORY,
      useClass: PrismaListingRepository,
    },
  ],
})
export class MarketplaceModule {}
