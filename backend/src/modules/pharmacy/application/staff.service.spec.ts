import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserEntity } from '../../identity/domain/user.entity';
import { UserRole } from '../../identity/domain/user-role.enum';
import { UserStatus } from '../../identity/domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../identity/domain/user.repository';
import { PharmacyEntity } from '../domain/pharmacy.entity';
import { PharmacyVerificationStatus } from '../domain/pharmacy-verification-status.enum';
import { PHARMACY_REPOSITORY, PharmacyRepository } from '../domain/pharmacy.repository';
import { StaffService } from './staff.service';

const makePharmacy = (overrides: Partial<PharmacyEntity> = {}): PharmacyEntity =>
  new PharmacyEntity({
    id: 'pharm-1',
    name: 'داروخانه سلامت',
    licenseNumber: '123',
    verified: true,
    verificationStatus: PharmacyVerificationStatus.VERIFIED,
    licenseDocumentPath: null,
    licenseDocumentName: null,
    licenseMimeType: null,
    licenseSubmittedAt: new Date(),
    rejectionReason: null,
    reviewedAt: new Date(),
    reviewedById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

const makeOwner = (overrides: Partial<UserEntity> = {}): UserEntity =>
  new UserEntity({
    id: 'owner-1',
    phone: '09121234567',
    fullName: 'Owner',
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    pharmacyId: 'pharm-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

describe('StaffService', () => {
  let service: StaffService;
  let userRepository: jest.Mocked<UserRepository>;
  let pharmacyRepository: jest.Mocked<Pick<PharmacyRepository, 'findById'>>;

  beforeEach(async () => {
    userRepository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findManyByPharmacy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    pharmacyRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: PHARMACY_REPOSITORY, useValue: pharmacyRepository },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  describe('createStaff', () => {
    it('should create staff for verified pharmacy owner', async () => {
      const owner = makeOwner();
      userRepository.findById.mockResolvedValue(owner);
      pharmacyRepository.findById.mockResolvedValue(makePharmacy());
      userRepository.findByPhone.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(
        new UserEntity({
          id: 'staff-1',
          phone: '09123456789',
          fullName: 'Staff Member',
          role: UserRole.STAFF,
          status: UserStatus.ACTIVE,
          pharmacyId: 'pharm-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }),
      );

      const result = await service.createStaff(owner.id, {
        phone: '09123456789',
        fullName: 'Staff Member',
        role: UserRole.STAFF,
      });

      expect(result.phone).toBe('09123456789');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '09123456789',
          role: UserRole.STAFF,
          status: UserStatus.ACTIVE,
          pharmacyId: 'pharm-1',
        }),
      );
    });

    it('should reject non-owner users', async () => {
      userRepository.findById.mockResolvedValue(
        makeOwner({ role: UserRole.STAFF }),
      );

      await expect(
        service.createStaff('staff-user', {
          phone: '09123456789',
          fullName: 'Staff',
          role: UserRole.STAFF,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivateStaff', () => {
    it('should soft-delete staff belonging to owner pharmacy', async () => {
      const owner = makeOwner();
      const staff = new UserEntity({
        id: 'staff-1',
        phone: '09123456789',
        fullName: 'Staff',
        role: UserRole.STAFF,
        status: UserStatus.ACTIVE,
        pharmacyId: 'pharm-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      userRepository.findById
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce(staff);
      pharmacyRepository.findById.mockResolvedValue(makePharmacy());
      userRepository.softDelete.mockResolvedValue(staff);

      await service.deactivateStaff(owner.id, staff.id);

      expect(userRepository.softDelete).toHaveBeenCalledWith(staff.id);
    });

    it('should throw when staff not found', async () => {
      const owner = makeOwner();
      userRepository.findById.mockResolvedValueOnce(owner).mockResolvedValueOnce(null);
      pharmacyRepository.findById.mockResolvedValue(makePharmacy());

      await expect(service.deactivateStaff(owner.id, 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
