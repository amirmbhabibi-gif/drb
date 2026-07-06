import { Injectable } from '@nestjs/common';
import { User as PrismaUser, $Enums } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { UserStatus } from '../domain/user-status.enum';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { phone, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findManyByPharmacy(pharmacyId: string): Promise<UserEntity[]> {
    const records = await this.prisma.user.findMany({
      where: { pharmacyId, deletedAt: null },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(data: { phone: string; role: UserRole; status: UserStatus }): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data: {
        phone: data.phone,
        role: data.role as $Enums.UserRole,
        status: data.status as $Enums.UserStatus,
      },
    });
    return this.toDomain(record);
  }

  async update(
    id: string,
    data: {
      fullName?: string;
      pharmacyId?: string;
      status?: UserStatus;
      role?: UserRole;
    },
  ): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        pharmacyId: data.pharmacyId,
        status: data.status as $Enums.UserStatus | undefined,
        role: data.role as $Enums.UserRole | undefined,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: PrismaUser): UserEntity {
    return new UserEntity({
      id: record.id,
      phone: record.phone,
      fullName: record.fullName,
      role: record.role as UserRole,
      status: record.status as UserStatus,
      pharmacyId: record.pharmacyId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
