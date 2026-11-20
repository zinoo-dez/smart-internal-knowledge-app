import { Controller, Get, HttpStatus, Logger, Optional, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SemanticCacheService } from '../search/semantic-cache.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    database: 'connected' | 'error';
    redis: 'connected' | 'offline' | 'unconfigured';
  };
  metrics?: {
    memoryRssMb: number;
    memoryHeapUsedMb: number;
  };
}

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly semanticCacheService?: SemanticCacheService,
  ) {}

  @Get(['health', 'api/health'])
  async checkHealth(@Res() res: Response): Promise<Response> {
    const memory = process.memoryUsage();
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(1)),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        redis: 'unconfigured',
      },
      metrics: {
        memoryRssMb: Number((memory.rss / (1024 * 1024)).toFixed(1)),
        memoryHeapUsedMb: Number((memory.heapUsed / (1024 * 1024)).toFixed(1)),
      },
    };

    // 1. Probe Database Connectivity
    try {
      await this.prisma.client.$queryRawUnsafe('SELECT 1');
      result.services.database = 'connected';
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Health check failed for database: ${error.message}`);
      result.services.database = 'error';
      result.status = 'unhealthy';
    }

    // 2. Probe Redis Connectivity via shared singleton SemanticCacheService client (no connection churn)
    if (this.semanticCacheService && typeof this.semanticCacheService.ping === 'function') {
      const redisStatus = await this.semanticCacheService.ping();
      result.services.redis = redisStatus;
      if (redisStatus === 'offline' && result.status === 'healthy') {
        result.status = 'degraded';
      }
    } else if (process.env.REDIS_URL) {
      result.services.redis = 'offline';
      if (result.status === 'healthy') {
        result.status = 'degraded';
      }
    }

    const statusCode =
      result.status === 'unhealthy' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
    return res.status(statusCode).json(result);
  }
}
