import { Injectable } from '@nestjs/common';
import { Listing as PrismaListing, Prisma, $Enums } from '@prisma/client';
import { PageResult, toPageResult } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ListingEntity } from '../domain/listing.entity';
import { parseListingMetadata } from '../domain/listing-metadata.vo';
import { ListingStatus } from '../domain/listing-status.enum';
import { ListingType } from '../domain/listing-type.enum';
import { DeliveryMethod } from '../domain/delivery-method.enum';
import { MedicationSummary } from '../domain/medication-summary.vo';
import { ListingQueryFilters, ListingRepository } from '../domain/listing.repository';

const listingInclude = {
  offeredMedications: {
    include: { medication: true },
  },
  wantedMedications: {
    include: { medication: true },
  },
} as const;

type ListingWithRelations = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

/**
 * Concrete implementation of the ListingRepository port using Prisma.
 */
@Injectable()
export class PrismaListingRepository implements ListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    pharmacyId: string;
    type: ListingType;
    rawText: string;
    metadata: Record<string, unknown>;
    deliveryMethods: DeliveryMethod[];
    offeredMedicationIds: string[];
    acceptedMedicationIds: string[];
  }): Promise<ListingEntity> {
    const record = await this.prisma.listing.create({
      data: {
        pharmacyId: data.pharmacyId,
        type: data.type as $Enums.ListingType,
        rawText: data.rawText,
        metadata: data.metadata as Prisma.InputJsonValue,
        status: ListingStatus.ACTIVE as $Enums.ListingStatus,
        deliveryMethods: data.deliveryMethods as $Enums.DeliveryMethod[],
        offeredMedications: {
          create: data.offeredMedicationIds.map((medicationId) => ({ medicationId })),
        },
        wantedMedications: {
          create: data.acceptedMedicationIds.map((medicationId) => ({ medicationId })),
        },
      },
      include: listingInclude,
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<ListingEntity | null> {
    const record = await this.prisma.listing.findUnique({
      where: { id },
      include: listingInclude,
    });
    return record ? this.toDomain(record) : null;
  }

  async findMany(
    filters: ListingQueryFilters,
    page: number,
    limit: number,
  ): Promise<PageResult<ListingEntity>> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: listingInclude,
      }),
      this.prisma.listing.count({ where }),
    ]);

    const items = records.map((r) => this.toDomain(r));
    return toPageResult(items, total, page, limit);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.listing.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhereClause(filters: ListingQueryFilters): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
    };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.pharmacyId) where.pharmacyId = filters.pharmacyId;

    if (filters.q) {
      where.rawText = {
        contains: filters.q,
        mode: 'insensitive',
      };
    }

    return where;
  }

  private toDomain(record: ListingWithRelations): ListingEntity {
    return new ListingEntity({
      id: record.id,
      pharmacyId: record.pharmacyId,
      type: record.type as ListingType,
      rawText: record.rawText,
      metadata: parseListingMetadata(record.metadata),
      status: record.status as ListingStatus,
      deliveryMethods: record.deliveryMethods as DeliveryMethod[],
      offeredMedications: record.offeredMedications.map((row) => this.toMedicationSummary(row.medication)),
      wantedMedications: record.wantedMedications.map((row) => this.toMedicationSummary(row.medication)),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  private toMedicationSummary(medication: {
    id: string;
    name: string;
    genericName: string | null;
    form: string | null;
    strength: string | null;
  }): MedicationSummary {
    return {
      id: medication.id,
      name: medication.name,
      genericName: medication.genericName,
      form: medication.form,
      strength: medication.strength,
    };
  }
}
