import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertIranianMobile } from '../../../common/phone/iranian-phone';
import { UserEntity } from '../../identity/domain/user.entity';
import { UserRole } from '../../identity/domain/user-role.enum';
import { UserStatus } from '../../identity/domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../identity/domain/user.repository';
import { PharmacyVerificationStatus } from '../domain/pharmacy-verification-status.enum';
import { PHARMACY_REPOSITORY, PharmacyRepository } from '../domain/pharmacy.repository';
import { CreateStaffDto, StaffResponseDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PHARMACY_REPOSITORY)
    private readonly pharmacyRepository: PharmacyRepository,
  ) {}

  async createStaff(ownerId: string, dto: CreateStaffDto): Promise<StaffResponseDto> {
    const owner = await this.requireOwner(ownerId);
    const pharmacy = await this.requireVerifiedPharmacy(owner.pharmacyId!);

    const phone = assertIranianMobile(dto.phone);
    const existing = await this.userRepository.findByPhone(phone);

    if (existing) {
      throw new ConflictException('A user with this phone number already exists');
    }

    const staff = await this.userRepository.create({
      phone,
      fullName: dto.fullName.trim(),
      role: dto.role,
      status: UserStatus.ACTIVE,
      pharmacyId: pharmacy.id,
    });

    return this.toStaffResponse(staff);
  }

  async listStaff(ownerId: string): Promise<StaffResponseDto[]> {
    const owner = await this.requireOwner(ownerId);
    await this.requireVerifiedPharmacy(owner.pharmacyId!);

    const users = await this.userRepository.findManyByPharmacy(owner.pharmacyId!);

    return users
      .filter((user) => user.id !== owner.id && user.role !== UserRole.OWNER)
      .map((user) => this.toStaffResponse(user));
  }

  async deactivateStaff(ownerId: string, staffId: string): Promise<void> {
    const owner = await this.requireOwner(ownerId);
    await this.requireVerifiedPharmacy(owner.pharmacyId!);

    const staff = await this.userRepository.findById(staffId);

    if (!staff || staff.isDeleted()) {
      throw new NotFoundException('Staff member not found');
    }

    if (staff.pharmacyId !== owner.pharmacyId) {
      throw new ForbiddenException('Staff member does not belong to your pharmacy');
    }

    if (staff.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot deactivate the pharmacy owner');
    }

    await this.userRepository.softDelete(staff.id);
  }

  private async requireOwner(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);

    if (!user || user.isDeleted()) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only pharmacy owners can manage staff');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Only active pharmacy owners can manage staff');
    }

    if (!user.pharmacyId) {
      throw new ForbiddenException('Pharmacy profile required');
    }

    return user;
  }

  private async requireVerifiedPharmacy(pharmacyId: string) {
    const pharmacy = await this.pharmacyRepository.findById(pharmacyId);

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    if (pharmacy.verificationStatus !== PharmacyVerificationStatus.VERIFIED) {
      throw new ForbiddenException('Pharmacy must be verified before managing staff');
    }

    return pharmacy;
  }

  private toStaffResponse(user: UserEntity): StaffResponseDto {
    return new StaffResponseDto({
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    });
  }
}
