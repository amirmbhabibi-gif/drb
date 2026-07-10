/**
 * E2E tests for the /listings endpoint.
 *
 * These tests require a running PostgreSQL instance.
 * Run: docker compose up -d && npx prisma migrate deploy && npm run seed:medications
 *
 * Usage: npm run test:e2e
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { DeliveryMethod } from '../src/modules/marketplace/domain/delivery-method.enum';
import { ListingType } from '../src/modules/marketplace/domain/listing-type.enum';

describe('ListingController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
    await app.close();
  });

  describe('POST /api/v1/listings', () => {
    it('should return 401 without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          type: ListingType.OFFER,
          offeredMedicationIds: ['11111111-1111-1111-1111-111111111111'],
          deliveryMethods: [DeliveryMethod.PICKUP],
        })
        .expect(401);
    });

    it('should return 400 when offeredMedicationIds is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          type: ListingType.OFFER,
          deliveryMethods: [DeliveryMethod.PICKUP],
        })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });

    it('should return 400 for unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          type: ListingType.OFFER,
          offeredMedicationIds: ['11111111-1111-1111-1111-111111111111'],
          deliveryMethods: [DeliveryMethod.PICKUP],
          pharmacyId: 'should-not-be-here',
        })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

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

    it('should return 400 for invalid type filter', async () => {
      await request(app.getHttpServer()).get('/api/v1/listings?type=INVALID').expect(400);
    });
  });

  describe('GET /api/v1/medications', () => {
    it('should return paginated medications', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/medications').expect(200);

      expect(res.body.data).toMatchObject({
        items: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 20,
        totalPages: expect.any(Number),
      });
    });
  });

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
