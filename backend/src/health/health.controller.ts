import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';

interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check service health (DB + Redis)' })
  async check(): Promise<HealthStatus> {
    const [dbOk, redisOk] = await Promise.all([this.checkDatabase(), this.redis.ping()]);

    const services = {
      database: dbOk ? ('up' as const) : ('down' as const),
      redis: redisOk ? ('up' as const) : ('down' as const),
    };

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
