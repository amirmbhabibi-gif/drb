import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserEntity } from '../../identity/domain/user.entity';
import { UserRole } from '../../identity/domain/user-role.enum';
import { UserStatus } from '../../identity/domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../identity/domain/user.repository';
import { ListingEntity } from '../domain/listing.entity';
import { ListingMetadata } from '../domain/listing-metadata.vo';
import { ListingStatus } from '../domain/listing-status.enum';
import { ListingType } from '../domain/listing-type.enum';
import { LISTING_REPOSITORY, ListingRepository } from '../domain/listing.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { ListingService } from './listing.service';

const makeEntity = (overrides: Partial<ListingEntity> = {}): ListingEntity =>
  new ListingEntity({
    id: 'aaaa-bbbb-cccc-dddd-eeee',
    pharmacyId: 'pharm-1111-2222-3333-4444',
    type: ListingType.OFFER,
    rawText: 'Amoxicillin 500mg, 3 boxes',
    metadata: {} as ListingMetadata,
    status: ListingStatus.ACTIVE,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  });

describe('ListingService', () => {
  let service: ListingService;
  let repository: jest.Mocked<ListingRepository>;
  let userRepository: jest.Mocked<UserRepository>;

  const activeUser = new UserEntity({
    id: 'user-1',
    phone: '09121234567',
    fullName: 'Test',
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    pharmacyId: 'pharm-1111-2222-3333-4444',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(async () => {
    const mockRepository: jest.Mocked<ListingRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      softDelete: jest.fn(),
    };
    userRepository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findManyByPharmacy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        { provide: LISTING_REPOSITORY, useValue: mockRepository },
        { provide: USER_REPOSITORY, useValue: userRepository },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
    repository = mockRepository;
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createListing ─────────────────────────────────────────────────────────

  describe('createListing', () => {
    it('should create and return a listing response DTO', async () => {
      const dto: CreateListingDto = {
        type: ListingType.OFFER,
        rawText: '  Amoxicillin 500mg, 3 boxes  ',
        metadata: undefined,
      };
      const entity = makeEntity();
      userRepository.findById.mockResolvedValue(activeUser);
      repository.create.mockResolvedValue(entity);

      const result = await service.createListing(dto, activeUser.id);

      expect(repository.create).toHaveBeenCalledWith({
        pharmacyId: activeUser.pharmacyId,
        type: dto.type,
        rawText: 'Amoxicillin 500mg, 3 boxes',
        metadata: {},
      });
      expect(result.id).toBe(entity.id);
      expect(result.type).toBe(ListingType.OFFER);
    });

    it('should reject listing creation for non-active users', async () => {
      userRepository.findById.mockResolvedValue(
        new UserEntity({
          ...activeUser,
          status: UserStatus.PENDING_VERIFICATION,
        } as UserEntity),
      );

      await expect(
        service.createListing(
          { type: ListingType.OFFER, rawText: 'test', metadata: undefined },
          activeUser.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getListingById ────────────────────────────────────────────────────────

  describe('getListingById', () => {
    it('should return a listing response DTO when found', async () => {
      const entity = makeEntity();
      repository.findById.mockResolvedValue(entity);

      const result = await service.getListingById(entity.id);

      expect(result.id).toBe(entity.id);
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getListingById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted listings', async () => {
      repository.findById.mockResolvedValue(makeEntity({ deletedAt: new Date() }));

      await expect(service.getListingById('some-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getListings ───────────────────────────────────────────────────────────

  describe('getListings', () => {
    it('should default to ACTIVE status when none is provided', async () => {
      const entity = makeEntity();
      repository.findMany.mockResolvedValue({
        items: [entity],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const query = new QueryListingsDto();
      const result = await service.getListings(query);

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: ListingStatus.ACTIVE }),
        1,
        20,
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass through explicit filters', async () => {
      repository.findMany.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const query = Object.assign(new QueryListingsDto(), {
        type: ListingType.NEED,
        status: ListingStatus.CLOSED,
        q: 'amoxicillin',
        page: 2,
        limit: 10,
      });
      await service.getListings(query);

      expect(repository.findMany).toHaveBeenCalledWith(
        {
          type: ListingType.NEED,
          status: ListingStatus.CLOSED,
          pharmacyId: undefined,
          q: 'amoxicillin',
        },
        2,
        10,
      );
    });
  });

  // ─── deleteListing ─────────────────────────────────────────────────────────

  describe('deleteListing', () => {
    it('should call softDelete when listing exists and is not deleted', async () => {
      repository.findById.mockResolvedValue(makeEntity());
      repository.softDelete.mockResolvedValue(undefined);

      await service.deleteListing('aaaa-bbbb-cccc-dddd-eeee');

      expect(repository.softDelete).toHaveBeenCalledWith('aaaa-bbbb-cccc-dddd-eeee');
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteListing('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });
});
