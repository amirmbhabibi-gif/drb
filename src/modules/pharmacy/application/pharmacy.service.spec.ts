import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserEntity } from '../../identity/domain/user.entity';
import { UserRole } from '../../identity/domain/user-role.enum';
import { UserStatus } from '../../identity/domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../identity/domain/user.repository';
import { LocalFileStorage } from '../../../infra/storage/local-file.storage';
import { PharmacyEntity } from '../domain/pharmacy.entity';
import { PharmacyVerificationStatus } from '../domain/pharmacy-verification-status.enum';
import { PHARMACY_REPOSITORY, PharmacyRepository } from '../domain/pharmacy.repository';
import { PharmacyService } from './pharmacy.service';

const makePharmacy = (overrides: Partial<PharmacyEntity> = {}): PharmacyEntity =>
  new PharmacyEntity({
    id: 'pharm-1',
    name: 'داروخانه سلامت',
    licenseNumber: '123',
    verified: false,
    verificationStatus: PharmacyVerificationStatus.PENDING,
    licenseDocumentPath: 'licenses/test.pdf',
    licenseDocumentName: 'license.pdf',
    licenseMimeType: 'application/pdf',
    licenseSubmittedAt: new Date(),
    rejectionReason: null,
    reviewedAt: null,
    reviewedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  new UserEntity({
    id: 'user-1',
    phone: '09121234567',
    fullName: null,
    role: UserRole.OWNER,
    status: UserStatus.PENDING_PROFILE,
    pharmacyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

describe('PharmacyService', () => {
  let service: PharmacyService;
  let pharmacyRepository: jest.Mocked<PharmacyRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let fileStorage: jest.Mocked<Pick<LocalFileStorage, 'saveLicense' | 'open'>>;

  const mockFile = {
    originalname: 'license.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('pdf'),
  } as Express.Multer.File;

  beforeEach(async () => {
    pharmacyRepository = {
      findById: jest.fn(),
      findManyByStatus: jest.fn(),
      findManyAll: jest.fn(),
      create: jest.fn(),
      updateLicenseSubmission: jest.fn(),
      markVerified: jest.fn(),
      markRejected: jest.fn(),
    };
    userRepository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findManyByPharmacy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    fileStorage = {
      saveLicense: jest.fn().mockReturnValue({
        relativePath: 'licenses/test.pdf',
        absolutePath: '/uploads/licenses/test.pdf',
        originalName: 'license.pdf',
        mimeType: 'application/pdf',
      }),
      open: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        { provide: PHARMACY_REPOSITORY, useValue: pharmacyRepository },
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: LocalFileStorage, useValue: fileStorage },
      ],
    }).compile();

    service = module.get(PharmacyService);
  });

  it('submits license for new pharmacy', async () => {
    const user = makeUser();
    const pharmacy = makePharmacy();
    userRepository.findById.mockResolvedValue(user);
    pharmacyRepository.create.mockResolvedValue(pharmacy);
    userRepository.update.mockResolvedValue(
      makeUser({ pharmacyId: pharmacy.id, status: UserStatus.PENDING_VERIFICATION }),
    );

    const result = await service.submitLicense(
      user.id,
      { name: 'داروخانه سلامت', licenseNumber: '123' },
      mockFile,
    );

    expect(pharmacyRepository.create).toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith(user.id, {
      pharmacyId: pharmacy.id,
      fullName: 'داروخانه سلامت',
      status: UserStatus.PENDING_VERIFICATION,
    });
    expect(result.id).toBe(pharmacy.id);
  });

  it('verifies pharmacy and activates users', async () => {
    const pharmacy = makePharmacy();
    const user = makeUser({ pharmacyId: pharmacy.id, status: UserStatus.PENDING_VERIFICATION });
    pharmacyRepository.findById.mockResolvedValue(pharmacy);
    pharmacyRepository.markVerified.mockResolvedValue(
      makePharmacy({ verificationStatus: PharmacyVerificationStatus.VERIFIED, verified: true }),
    );
    userRepository.findManyByPharmacy.mockResolvedValue([user]);
    userRepository.update.mockResolvedValue(makeUser({ status: UserStatus.ACTIVE }));

    const result = await service.verifyPharmacy(pharmacy.id, 'admin-1');

    expect(pharmacyRepository.markVerified).toHaveBeenCalledWith(pharmacy.id, 'admin-1');
    expect(userRepository.update).toHaveBeenCalledWith(user.id, { status: UserStatus.ACTIVE });
    expect(result.verificationStatus).toBe(PharmacyVerificationStatus.VERIFIED);
  });

  it('rejects pharmacy and sets users to REJECTED', async () => {
    const pharmacy = makePharmacy();
    const user = makeUser({ pharmacyId: pharmacy.id, status: UserStatus.PENDING_VERIFICATION });
    pharmacyRepository.findById.mockResolvedValue(pharmacy);
    pharmacyRepository.markRejected.mockResolvedValue(
      makePharmacy({
        verificationStatus: PharmacyVerificationStatus.REJECTED,
        rejectionReason: 'نامعتبر',
      }),
    );
    userRepository.findManyByPharmacy.mockResolvedValue([user]);
    userRepository.update.mockResolvedValue(makeUser({ status: UserStatus.REJECTED }));

    const result = await service.rejectPharmacy(pharmacy.id, 'admin-1', 'نامعتبر');

    expect(pharmacyRepository.markRejected).toHaveBeenCalledWith(pharmacy.id, 'admin-1', 'نامعتبر');
    expect(userRepository.update).toHaveBeenCalledWith(user.id, { status: UserStatus.REJECTED });
    expect(result.rejectionReason).toBe('نامعتبر');
  });

  it('throws when user status does not allow submission', async () => {
    const blockedUser = makeUser({ status: UserStatus.ACTIVE });
    userRepository.findById.mockResolvedValue(blockedUser);

    await expect(
      service.submitLicense(blockedUser.id, { name: 'x', licenseNumber: '1' }, mockFile),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when pharmacy not found for verify', async () => {
    pharmacyRepository.findById.mockResolvedValue(null);

    await expect(service.verifyPharmacy('missing', 'admin-1')).rejects.toThrow(NotFoundException);
  });
});
