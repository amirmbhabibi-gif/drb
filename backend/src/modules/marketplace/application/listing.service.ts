import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PageResult } from '../../../common/dto/pagination.dto';
import { MEDICATION_REPOSITORY, MedicationRepository } from '../../catalog/domain/medication.repository';
import { UserStatus } from '../../identity/domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../identity/domain/user.repository';
import { ListingStatus } from '../domain/listing-status.enum';
import { ListingType } from '../domain/listing-type.enum';
import { LISTING_REPOSITORY, ListingRepository } from '../domain/listing.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingResponseDto } from './dto/listing.response.dto';
import { QueryListingsDto } from './dto/query-listings.dto';

/**
 * ListingService – application-layer use cases for the Marketplace context.
 */
@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepository: ListingRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(MEDICATION_REPOSITORY)
    private readonly medicationRepository: MedicationRepository,
  ) {}

  async createListing(dto: CreateListingDto, userId: string): Promise<ListingResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user || user.isDeleted()) {
      throw new ForbiddenException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Only verified active pharmacies can create listings');
    }

    if (!user.pharmacyId) {
      throw new ForbiddenException('Pharmacy profile required');
    }

    if (dto.type === ListingType.SWAP) {
      if (!dto.acceptedMedicationIds?.length) {
        throw new BadRequestException('SWAP listings require at least one accepted medication');
      }
    }

    const allMedicationIds = [
      ...dto.offeredMedicationIds,
      ...(dto.acceptedMedicationIds ?? []),
    ];
    const uniqueMedicationIds = [...new Set(allMedicationIds)];
    const medications = await this.medicationRepository.findManyByIds(uniqueMedicationIds);

    if (medications.length !== uniqueMedicationIds.length) {
      throw new BadRequestException('One or more medication IDs are invalid');
    }

    const listing = await this.listingRepository.create({
      pharmacyId: user.pharmacyId,
      type: dto.type,
      rawText: dto.rawText?.trim() ?? '',
      metadata: (dto.metadata as Record<string, unknown>) ?? {},
      deliveryMethods: dto.deliveryMethods,
      offeredMedicationIds: dto.offeredMedicationIds,
      acceptedMedicationIds: dto.acceptedMedicationIds ?? [],
    });

    this.logger.log(
      `Listing created: ${listing.id} [${listing.type}] by pharmacy ${listing.pharmacyId}`,
    );

    return ListingResponseDto.fromEntity(listing);
  }

  async getListingById(id: string): Promise<ListingResponseDto> {
    const listing = await this.listingRepository.findById(id);

    if (!listing || listing.isDeleted()) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    return ListingResponseDto.fromEntity(listing);
  }

  async getListings(query: QueryListingsDto): Promise<PageResult<ListingResponseDto>> {
    const result = await this.listingRepository.findMany(
      {
        type: query.type,
        status: query.status ?? ListingStatus.ACTIVE,
        pharmacyId: query.pharmacyId,
        q: query.q,
      },
      query.page,
      query.limit,
    );

    return {
      items: result.items.map(ListingResponseDto.fromEntity),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async deleteListing(id: string): Promise<void> {
    const listing = await this.listingRepository.findById(id);

    if (!listing || listing.isDeleted()) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    await this.listingRepository.softDelete(id);
    this.logger.log(`Listing soft-deleted: ${id}`);
  }
}
