import { Injectable } from '@nestjs/common';
import { Listing as PrismaListing, Prisma, $Enums } from '@prisma/client';
import { PageResult, toPageResult } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ListingEntity } from '../domain/listing.entity';
import { parseListingMetadata } from '../domain/listing-metadata.vo';
import { ListingStatus } from '../domain/listing-status.enum';
import { ListingType } from '../domain/listing-type.enum';
import { ListingQueryFilters, ListingRepository } from '../domain/listing.repository';

/**
 * Concrete implementation of the ListingRepository port using Prisma.
 *
 * Infrastructure concerns live here: ORM queries, mapping, soft-delete filters.
 * The domain and application layers see only the abstract ListingRepository port.
 */
@Injectable()
export class PrismaListingRepository implements ListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    pharmacyId: string;
    type: ListingType;
    rawText: string;
    metadata: Record<string, unknown>;
  }): Promise<ListingEntity> {
    const record = await this.prisma.listing.create({
      data: {
        pharmacyId: data.pharmacyId,
        type: data.type as $Enums.ListingType,
        rawText: data.rawText,
        metadata: data.metadata as Prisma.InputJsonValue,
        status: ListingStatus.ACTIVE as $Enums.ListingStatus,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<ListingEntity | null> {
    const record = await this.prisma.listing.findUnique({ where: { id } });
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

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildWhereClause(filters: ListingQueryFilters): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = {
      deletedAt: null, // always exclude soft-deleted rows
    };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.pharmacyId) where.pharmacyId = filters.pharmacyId;

    if (filters.q) {
      where.rawText = {
        contains: filters.q,
        mode: 'insensitive', // ILIKE; Phase 2: migrate to pg_trgm GIN index
      };
    }

    return where;
  }

  /**
   * Maps a Prisma Listing record to the domain ListingEntity.
   * Keeps Prisma types strictly inside the infrastructure layer.
   */
  private toDomain(record: PrismaListing): ListingEntity {
    return new ListingEntity({
      id: record.id,
      pharmacyId: record.pharmacyId,
      type: record.type as ListingType,
      rawText: record.rawText,
      metadata: parseListingMetadata(record.metadata),
      status: record.status as ListingStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
