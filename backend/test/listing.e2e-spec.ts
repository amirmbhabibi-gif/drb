/**
 * E2E tests for the /listings endpoint.
 *
 * These tests require a running PostgreSQL instance.
 * Run: docker compose up -d && npx prisma migrate dev --before running.
 *
 * Usage: npm run test:e2e
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ListingType } from '../src/modules/marketplace/domain/listing-type.enum';
import { PrismaService } from '../src/infra/prisma/prisma.service';

const PHARMACY_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('ListingController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await prisma.listing.deleteMany({ where: { pharmacyId: PHARMACY_ID } });
    await app.close();
  });

  // ─── POST /listings ───────────────────────────────────────────────────────

  describe('POST /api/v1/listings', () => {
    it('should create a listing and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          pharmacyId: PHARMACY_ID,
          type: ListingType.OFFER,
          rawText: 'Amoxicillin 500mg capsules, 5 boxes, expiry 2025-06',
          metadata: {
            urgencyLevel: 3,
            quantity: { value: 5, unit: 'boxes' },
          },
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        pharmacyId: PHARMACY_ID,
        type: 'OFFER',
        rawText: 'Amoxicillin 500mg capsules, 5 boxes, expiry 2025-06',
        status: 'ACTIVE',
      });
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 400 when rawText is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({ pharmacyId: PHARMACY_ID, type: ListingType.OFFER })
        .expect(400);
    });

    it('should return 400 when pharmacyId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({ pharmacyId: 'not-a-uuid', type: ListingType.OFFER, rawText: 'test' })
        .expect(400);
    });

    it('should return 400 for unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          pharmacyId: PHARMACY_ID,
          type: ListingType.OFFER,
          rawText: 'test listing',
          unknownField: 'should fail',
        })
        .expect(400);
    });
  });

  // ─── GET /listings ────────────────────────────────────────────────────────

  describe('GET /api/v1/listings', () => {
    it('should return paginated results', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/listings').expect(200);

      expect(res.body.data).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 20,
        totalPages: expect.any(Number),
      });
    });

    it('should filter by pharmacyId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/listings?pharmacyId=${PHARMACY_ID}`)
        .expect(200);

      res.body.data.items.forEach((item: { pharmacyId: string }) => {
        expect(item.pharmacyId).toBe(PHARMACY_ID);
      });
    });

    it('should search by q', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/listings?q=Amoxicillin')
        .expect(200);

      expect(res.body.data.items.length).toBeGreaterThan(0);
      res.body.data.items.forEach((item: { rawText: string }) => {
        expect(item.rawText.toLowerCase()).toContain('amoxicillin');
      });
    });

    it('should return 400 for invalid type filter', async () => {
      await request(app.getHttpServer()).get('/api/v1/listings?type=INVALID').expect(400);
    });
  });

  // ─── GET /listings/:id ────────────────────────────────────────────────────

  describe('GET /api/v1/listings/:id', () => {
    it('should return 404 for non-existent listing', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/listings/3fa85f64-5717-4562-b3fc-2c963f66afff')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer()).get('/api/v1/listings/not-a-uuid').expect(400);
    });
  });
});
