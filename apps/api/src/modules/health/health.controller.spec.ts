import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController (Container Liveness & Readiness Probes)', () => {
  let controller: HealthController;
  let mockPrisma: any;
  let mockRes: any;

  beforeEach(() => {
    mockPrisma = {
      client: {
        $queryRawUnsafe: vi.fn(),
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((data) => data),
    };

    controller = new HealthController(mockPrisma as PrismaService);
  });

  it('should return 200 OK with healthy status when database is reachable', async () => {
    mockPrisma.client.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

    await controller.checkHealth(mockRes);

    expect(mockPrisma.client.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        services: expect.objectContaining({
          database: 'connected',
        }),
      }),
    );
  });

  it('should return 503 Service Unavailable when database query fails', async () => {
    mockPrisma.client.$queryRawUnsafe.mockRejectedValue(new Error('Connection terminated unexpectedly'));

    await controller.checkHealth(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unhealthy',
        services: expect.objectContaining({
          database: 'error',
        }),
      }),
    );
  });
});
