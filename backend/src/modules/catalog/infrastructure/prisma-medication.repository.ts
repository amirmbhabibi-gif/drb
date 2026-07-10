import { Injectable } from '@nestjs/common';
import { Medication as PrismaMedication, Prisma } from '@prisma/client';
import { PageResult, toPageResult } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { MedicationEntity } from '../domain/medication.entity';
import { MedicationQueryFilters, MedicationRepository } from '../domain/medication.repository';

@Injectable()
export class PrismaMedicationRepository implements MedicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MedicationEntity | null> {
    const record = await this.prisma.medication.findFirst({
      where: { id, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findMany(
    filters: MedicationQueryFilters,
    page: number,
    limit: number,
  ): Promise<PageResult<MedicationEntity>> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.medication.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.medication.count({ where }),
    ]);

    return toPageResult(records.map((r) => this.toDomain(r)), total, page, limit);
  }

  async findManyByIds(ids: string[]): Promise<MedicationEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.prisma.medication.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    return records.map((r) => this.toDomain(r));
  }

  private buildWhereClause(filters: MedicationQueryFilters): Prisma.MedicationWhereInput {
    const where: Prisma.MedicationWhereInput = { deletedAt: null };

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { genericName: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private toDomain(record: PrismaMedication): MedicationEntity {
    return new MedicationEntity({
      id: record.id,
      name: record.name,
      genericName: record.genericName,
      form: record.form,
      strength: record.strength,
      atcCode: record.atcCode,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
