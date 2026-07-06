import { Injectable } from '@nestjs/common';
import { Pharmacy as PrismaPharmacy, $Enums } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { PharmacyEntity } from '../domain/pharmacy.entity';
import { PharmacyVerificationStatus } from '../domain/pharmacy-verification-status.enum';
import { PharmacyRepository } from '../domain/pharmacy.repository';

@Injectable()
export class PrismaPharmacyRepository implements PharmacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PharmacyEntity | null> {
    const record = await this.prisma.pharmacy.findFirst({
      where: { id, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findManyByStatus(status: PharmacyVerificationStatus): Promise<PharmacyEntity[]> {
    const records = await this.prisma.pharmacy.findMany({
      where: { verificationStatus: status as $Enums.PharmacyVerificationStatus, deletedAt: null },
      orderBy: { licenseSubmittedAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findManyAll(): Promise<PharmacyEntity[]> {
    const records = await this.prisma.pharmacy.findMany({
      where: { deletedAt: null },
      orderBy: { licenseSubmittedAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(data: {
    name: string;
    licenseNumber: string;
    licenseDocumentPath: string;
    licenseDocumentName: string;
    licenseMimeType: string;
  }): Promise<PharmacyEntity> {
    const record = await this.prisma.pharmacy.create({
      data: {
        name: data.name,
        licenseNumber: data.licenseNumber,
        verificationStatus: PharmacyVerificationStatus.PENDING as $Enums.PharmacyVerificationStatus,
        verified: false,
        licenseDocumentPath: data.licenseDocumentPath,
        licenseDocumentName: data.licenseDocumentName,
        licenseMimeType: data.licenseMimeType,
        licenseSubmittedAt: new Date(),
        rejectionReason: null,
      },
    });
    return this.toDomain(record);
  }

  async updateLicenseSubmission(
    id: string,
    data: {
      name: string;
      licenseNumber: string;
      licenseDocumentPath: string;
      licenseDocumentName: string;
      licenseMimeType: string;
    },
  ): Promise<PharmacyEntity> {
    const record = await this.prisma.pharmacy.update({
      where: { id },
      data: {
        name: data.name,
        licenseNumber: data.licenseNumber,
        verificationStatus: PharmacyVerificationStatus.PENDING as $Enums.PharmacyVerificationStatus,
        verified: false,
        licenseDocumentPath: data.licenseDocumentPath,
        licenseDocumentName: data.licenseDocumentName,
        licenseMimeType: data.licenseMimeType,
        licenseSubmittedAt: new Date(),
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
      },
    });
    return this.toDomain(record);
  }

  async markVerified(id: string, reviewedById: string): Promise<PharmacyEntity> {
    const record = await this.prisma.pharmacy.update({
      where: { id },
      data: {
        verificationStatus: PharmacyVerificationStatus.VERIFIED as $Enums.PharmacyVerificationStatus,
        verified: true,
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedById,
      },
    });
    return this.toDomain(record);
  }

  async markRejected(
    id: string,
    reviewedById: string,
    reason: string,
  ): Promise<PharmacyEntity> {
    const record = await this.prisma.pharmacy.update({
      where: { id },
      data: {
        verificationStatus: PharmacyVerificationStatus.REJECTED as $Enums.PharmacyVerificationStatus,
        verified: false,
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedById,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: PrismaPharmacy): PharmacyEntity {
    return new PharmacyEntity({
      id: record.id,
      name: record.name,
      licenseNumber: record.licenseNumber,
      verified: record.verified,
      verificationStatus: record.verificationStatus as PharmacyVerificationStatus,
      licenseDocumentPath: record.licenseDocumentPath,
      licenseDocumentName: record.licenseDocumentName,
      licenseMimeType: record.licenseMimeType,
      licenseSubmittedAt: record.licenseSubmittedAt,
      rejectionReason: record.rejectionReason,
      reviewedAt: record.reviewedAt,
      reviewedById: record.reviewedById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
