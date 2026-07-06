import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { LocalFileStorage } from '../../../infra/storage/local-file.storage';
import { UserEntity } from '../../identity/domain/user.entity';
import { UserRole } from '../../identity/domain/user-role.enum';
import { UserStatus } from '../../identity/domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../identity/domain/user.repository';
import { PharmacyEntity } from '../domain/pharmacy.entity';
import { PharmacyVerificationStatus } from '../domain/pharmacy-verification-status.enum';
import { PHARMACY_REPOSITORY, PharmacyRepository } from '../domain/pharmacy.repository';
import { PharmacyResponseDto, AdminPharmacyResponseDto, SubmitLicenseDto } from './dto/pharmacy.dto';

@Injectable()
export class PharmacyService {
  constructor(
    @Inject(PHARMACY_REPOSITORY)
    private readonly pharmacyRepository: PharmacyRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly fileStorage: LocalFileStorage,
  ) {}

  async submitLicense(
    userId: string,
    dto: SubmitLicenseDto,
    file: Express.Multer.File,
  ): Promise<PharmacyResponseDto> {
    const user = await this.requireUser(userId);

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot submit pharmacy licenses');
    }

    if (
      user.status !== UserStatus.PENDING_PROFILE &&
      user.status !== UserStatus.REJECTED
    ) {
      throw new ForbiddenException('License submission is not allowed in current status');
    }

    if (!file) {
      throw new BadRequestException('License file is required');
    }

    let stored;
    try {
      stored = this.fileStorage.saveLicense(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UPLOAD_FAILED';
      if (message === 'INVALID_FILE_TYPE') {
        throw new BadRequestException('Only JPEG, PNG, and PDF files are allowed');
      }
      if (message === 'FILE_TOO_LARGE') {
        throw new BadRequestException('File exceeds maximum allowed size');
      }
      throw new BadRequestException('Failed to upload license file');
    }

    let pharmacy: PharmacyEntity;

    if (user.pharmacyId) {
      pharmacy = await this.pharmacyRepository.updateLicenseSubmission(user.pharmacyId, {
        name: dto.name.trim(),
        licenseNumber: dto.licenseNumber.trim(),
        licenseDocumentPath: stored.relativePath,
        licenseDocumentName: stored.originalName,
        licenseMimeType: stored.mimeType,
      });
    } else {
      pharmacy = await this.pharmacyRepository.create({
        name: dto.name.trim(),
        licenseNumber: dto.licenseNumber.trim(),
        licenseDocumentPath: stored.relativePath,
        licenseDocumentName: stored.originalName,
        licenseMimeType: stored.mimeType,
      });
      await this.userRepository.update(user.id, {
        pharmacyId: pharmacy.id,
        fullName: dto.name.trim(),
        status: UserStatus.PENDING_VERIFICATION,
      });
      return PharmacyResponseDto.fromEntity(pharmacy);
    }

    await this.userRepository.update(user.id, {
      fullName: dto.name.trim(),
      status: UserStatus.PENDING_VERIFICATION,
    });

    return PharmacyResponseDto.fromEntity(pharmacy);
  }

  async getMyPharmacy(userId: string): Promise<PharmacyResponseDto | null> {
    const user = await this.requireUser(userId);
    if (!user.pharmacyId) {
      return null;
    }
    const pharmacy = await this.pharmacyRepository.findById(user.pharmacyId);
    return pharmacy ? PharmacyResponseDto.fromEntity(pharmacy) : null;
  }

  async getPharmacyForDownload(
    pharmacyId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ stream: Readable; mimeType: string; filename: string }> {
    const pharmacy = await this.pharmacyRepository.findById(pharmacyId);
    if (!pharmacy || !pharmacy.licenseDocumentPath) {
      throw new NotFoundException('License document not found');
    }

    const user = await this.requireUser(userId);
    const isOwner = user.pharmacyId === pharmacyId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    try {
      const stream = this.fileStorage.open(pharmacy.licenseDocumentPath);
      return {
        stream,
        mimeType: pharmacy.licenseMimeType ?? 'application/octet-stream',
        filename: pharmacy.licenseDocumentName ?? 'license',
      };
    } catch {
      throw new NotFoundException('License document not found');
    }
  }

  async listByStatus(status: PharmacyVerificationStatus): Promise<PharmacyResponseDto[]> {
    const pharmacies = await this.pharmacyRepository.findManyByStatus(status);
    return pharmacies.map(PharmacyResponseDto.fromEntity);
  }

  async listForAdmin(
    status?: PharmacyVerificationStatus | 'ALL',
  ): Promise<AdminPharmacyResponseDto[]> {
    const pharmacies =
      status && status !== 'ALL'
        ? await this.pharmacyRepository.findManyByStatus(status)
        : await this.pharmacyRepository.findManyAll();

    return Promise.all(
      pharmacies.map(async (pharmacy) => {
        const users = await this.userRepository.findManyByPharmacy(pharmacy.id);
        const ownerPhone = users[0]?.phone ?? null;
        return AdminPharmacyResponseDto.fromEntityWithOwner(pharmacy, ownerPhone);
      }),
    );
  }

  async verifyPharmacy(pharmacyId: string, adminId: string): Promise<PharmacyResponseDto> {
    const pharmacy = await this.pharmacyRepository.findById(pharmacyId);
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const updated = await this.pharmacyRepository.markVerified(pharmacyId, adminId);
    const users = await this.userRepository.findManyByPharmacy(pharmacyId);

    await Promise.all(
      users.map((user) =>
        this.userRepository.update(user.id, { status: UserStatus.ACTIVE }),
      ),
    );

    return PharmacyResponseDto.fromEntity(updated);
  }

  async rejectPharmacy(
    pharmacyId: string,
    adminId: string,
    reason: string,
  ): Promise<PharmacyResponseDto> {
    const pharmacy = await this.pharmacyRepository.findById(pharmacyId);
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const updated = await this.pharmacyRepository.markRejected(pharmacyId, adminId, reason);
    const users = await this.userRepository.findManyByPharmacy(pharmacyId);

    await Promise.all(
      users.map((user) =>
        this.userRepository.update(user.id, { status: UserStatus.REJECTED }),
      ),
    );

    return PharmacyResponseDto.fromEntity(updated);
  }

  private async requireUser(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.isDeleted()) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
