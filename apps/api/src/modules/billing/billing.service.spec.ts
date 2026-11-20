import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from './billing.service';
import { SubscriptionTier, TenantContext, UserRole } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;
  let mockPrisma: any;

  const tenant: TenantContext = {
    organizationId: 'org-test-tier',
    userId: 'user-admin',
    userRole: UserRole.ADMIN,
    userEmail: 'admin@company.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        queryLog: {
          findMany: vi.fn().mockResolvedValue([
            { totalTokens: 500 },
            { totalTokens: 1500 },
          ]),
        },
        document: {
          count: vi.fn().mockResolvedValue(5),
        },
      },
    };

    service = new BillingService(mockPrisma as PrismaService);
  });

  it('should default tenant tier to PRO and return usage summary', async () => {
    const usage = await service.getTenantUsage(tenant);

    expect(usage.tier).toBe(SubscriptionTier.PRO);
    expect(usage.queryCount).toBe(2);
    expect(usage.tokenCount).toBe(2000);
    expect(usage.documentCount).toBe(5);
    expect(usage.isQuotaExceeded).toBe(false);
  });

  it('should upgrade subscription tier and reflect in future usage checks', async () => {
    await service.upgradeSubscription(tenant, SubscriptionTier.ENTERPRISE);
    const usage = await service.getTenantUsage(tenant);

    expect(usage.tier).toBe(SubscriptionTier.ENTERPRISE);
    expect(usage.queryLimit).toBe(50000);
  });

  it('should flag quota exceeded if query count exceeds tier limit', async () => {
    service.setTenantTier(tenant.organizationId, SubscriptionTier.FREE);

    // Mock query logs returning 150 queries (FREE limit is 100)
    mockPrisma.client.queryLog.findMany.mockResolvedValue(
      new Array(150).fill({ totalTokens: 100 }),
    );

    const check = await service.checkQuota(tenant);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Monthly quota exceeded');
  });

  it('should allow queries when usage is within tier limits', async () => {
    const check = await service.checkQuota(tenant);
    expect(check.allowed).toBe(true);
  });

  it('should use DB-level queryLog.aggregate when available to avoid loading all logs into RAM', async () => {
    mockPrisma.client.queryLog.aggregate = vi.fn().mockResolvedValue({
      _count: { _all: 42 },
      _sum: { totalTokens: 84000 },
    });

    const usage = await service.getTenantUsage(tenant);
    expect(mockPrisma.client.queryLog.aggregate).toHaveBeenCalled();
    expect(usage.queryCount).toBe(42);
    expect(usage.tokenCount).toBe(84000);
  });
});
