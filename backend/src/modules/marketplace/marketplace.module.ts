import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ListingService } from './application/listing.service';
import { LISTING_REPOSITORY } from './domain/listing.repository';
import { PrismaListingRepository } from './infrastructure/prisma-listing.repository';
import { ListingController } from './presentation/listing.controller';

@Module({
  imports: [IdentityModule],
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
