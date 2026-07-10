import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  adminConfig,
  appConfig,
  databaseConfig,
  iranpayamakConfig,
  jwtConfig,
  otpConfig,
  redisConfig,
  uploadConfig,
  storageConfig,
} from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { StorageModule } from './infra/storage/storage.module';
import { SmsModule } from './infra/sms/sms.module';
import { HealthController } from './health/health.controller';
import { CatalogModule } from './modules/catalog/catalog.module';
import { IdentityModule } from './modules/identity/identity.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        iranpayamakConfig,
        jwtConfig,
        otpConfig,
        adminConfig,
        uploadConfig,
        storageConfig,
      ],
      cache: true,
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    SmsModule,
    CatalogModule,
    MarketplaceModule,
    IdentityModule,
    PharmacyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
