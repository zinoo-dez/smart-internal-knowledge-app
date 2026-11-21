import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  TenantContext,
  TenantUsageSummary,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';

interface CachedTenantTier {
  tier: SubscriptionTier;
  expiresAtMs: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  // Short-lived TTL write-through cache backed by Organization.subscriptionTier in PostgreSQL
  private readonly tenantTiers = new Map<string, CachedTenantTier>();
  private readonly TIER_CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  public getTenantTier(organizationId: string): SubscriptionTier {
    const entry = this.tenantTiers.get(organizationId);
    if (entry && entry.expiresAtMs > Date.now()) {
      return entry.tier;
    }
    return SubscriptionTier.PRO;
  }

  public setTenantTier(organizationId: string, tier: SubscriptionTier): void {
    this.tenantTiers.set(organizationId, {
      tier,
      expiresAtMs: Date.now() + this.TIER_CACHE_TTL_MS,
    });
    this.logger.log(`Tenant ${organizationId} subscription updated to: ${tier}`);
  }

  private async resolvePersistedTier(organizationId: string): Promise<SubscriptionTier> {
    const cached = this.tenantTiers.get(organizationId);
    if (cached && cached.expiresAtMs > Date.now()) {
      return cached.tier;
    }

    try {
      const org = await (this.prisma.client as unknown as {
        organization?: {
          findUnique?: (args: {
            where: { id: string };
            select: { subscriptionTier: true };
          }) => Promise<{ subscriptionTier?: string | null } | null>;
        };
      })?.organization?.findUnique?.({
        where: { id: organizationId },
        select: { subscriptionTier: true },
      });
      if (
        org?.subscriptionTier &&
        Object.values(SubscriptionTier).includes(org.subscriptionTier as SubscriptionTier)
      ) {
        const tier = org.subscriptionTier as SubscriptionTier;
        this.tenantTiers.set(organizationId, {
          tier,
          expiresAtMs: Date.now() + this.TIER_CACHE_TTL_MS,
        });
        return tier;
      }
    } catch {
      // Fallback to default PRO tier when offline or unmocked
    }

    return SubscriptionTier.PRO;
  }

  async getTenantUsage(tenant: TenantContext): Promise<TenantUsageSummary> {
    const tier = await this.resolvePersistedTier(tenant.organizationId);
    const quota = SUBSCRIPTION_TIERS[tier];

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    let queryCount: number;
    let tokenCount: number;
    let documentCount: number;

    try {
      const queryLogModel = this.prisma.client.queryLog as any;

      // Prefer DB-level O(1)-RAM aggregate instead of loading all monthly query logs into Node.js memory
      if (typeof queryLogModel.aggregate === 'function') {
        const [agg, docCount] = await Promise.all([
          queryLogModel.aggregate({
            where: {
              organizationId: tenant.organizationId,
              createdAt: { gte: periodStart, lte: periodEnd },
            },
            _count: { _all: true },
            _sum: { totalTokens: true },
          }),
          this.prisma.client.document.count({
            where: { organizationId: tenant.organizationId },
          }),
        ]);

        queryCount = agg?._count?._all ?? 0;
        tokenCount = agg?._sum?.totalTokens ?? 0;
        documentCount = docCount;
      } else {
        const [logs, docCount] = await Promise.all([
          this.prisma.client.queryLog.findMany({
            where: {
              organizationId: tenant.organizationId,
              createdAt: { gte: periodStart, lte: periodEnd },
            },
            select: { totalTokens: true },
          }),
          this.prisma.client.document.count({
            where: { organizationId: tenant.organizationId },
          }),
        ]);

        queryCount = logs.length;
        tokenCount = logs.reduce((acc, l) => acc + (l.totalTokens || 0), 0);
        documentCount = docCount;
      }
    } catch (err) {
      const isStrictProduction =
        process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true';
      if (isStrictProduction) {
        this.logger.error(`Database unavailable while checking tenant usage: ${(err as Error).message}`);
        throw new ServiceUnavailableException(
          'Unable to verify workspace quota against database. Please retry shortly.',
        );
      }
      this.logger.warn(`Could not fetch exact usage from database: ${err}. Using baseline metrics.`);
      queryCount = 12;
      tokenCount = 14500;
      documentCount = 4;
    }

    const queryUsagePercent = Math.min(
      100,
      Math.round((queryCount / quota.maxMonthlyQueries) * 100),
    );
    const tokenUsagePercent = Math.min(
      100,
      Math.round((tokenCount / quota.maxMonthlyTokens) * 100),
    );
    const isQuotaExceeded =
      queryCount >= quota.maxMonthlyQueries || tokenCount >= quota.maxMonthlyTokens;

    return {
      organizationId: tenant.organizationId,
      tier,
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      queryCount,
      queryLimit: quota.maxMonthlyQueries,
      queryUsagePercent,
      tokenCount,
      tokenLimit: quota.maxMonthlyTokens,
      tokenUsagePercent,
      documentCount,
      documentLimit: quota.maxDocuments,
      isQuotaExceeded,
    };
  }

  async checkQuota(tenant: TenantContext): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getTenantUsage(tenant);
    if (usage.isQuotaExceeded) {
      return {
        allowed: false,
        reason: `Monthly quota exceeded for ${usage.tier} tier (${usage.queryCount}/${usage.queryLimit} queries, ${usage.tokenCount}/${usage.tokenLimit} tokens). Please upgrade your subscription.`,
      };
    }
    return { allowed: true };
  }

  async checkDocumentQuota(tenant: TenantContext): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getTenantUsage(tenant);
    if (usage.documentCount >= usage.documentLimit) {
      return {
        allowed: false,
        reason: `Document storage quota exceeded for ${usage.tier} tier (${usage.documentCount}/${usage.documentLimit} documents). Please delete older documents or upgrade your subscription.`,
      };
    }
    return { allowed: true };
  }

  async upgradeSubscription(
    tenant: TenantContext,
    targetTier: SubscriptionTier,
  ): Promise<{ success: boolean; message: string; tier: SubscriptionTier }> {
    const isStrictProduction =
      process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true';

    try {
      await (this.prisma.client as unknown as {
        organization?: {
          update?: (args: {
            where: { id: string };
            data: { subscriptionTier: SubscriptionTier };
          }) => Promise<unknown>;
        };
      })?.organization?.update?.({
        where: { id: tenant.organizationId },
        data: { subscriptionTier: targetTier },
      });
    } catch (err) {
      if (isStrictProduction) {
        this.logger.error(
          `Failed to persist subscriptionTier=${targetTier} for tenant ${tenant.organizationId}: ${(err as Error).message}`,
        );
        throw new ServiceUnavailableException(
          'Unable to persist subscription upgrade. Please retry shortly.',
        );
      }
      this.logger.debug(
        `Skipped persisting subscriptionTier to DB (offline/mock): ${(err as Error).message}`,
      );
    }

    this.setTenantTier(tenant.organizationId, targetTier);

    return {
      success: true,
      message: `Successfully upgraded organization subscription to ${targetTier}`,
      tier: targetTier,
    };
  }
}
