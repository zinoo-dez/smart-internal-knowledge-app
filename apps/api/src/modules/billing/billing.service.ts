import { Injectable, Logger } from '@nestjs/common';
import {
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  TenantContext,
  TenantUsageSummary,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  // In-memory tenant tier cache (defaults to PRO for internal enterprise demo)
  private readonly tenantTiers = new Map<string, SubscriptionTier>();

  constructor(private readonly prisma: PrismaService) {}

  public getTenantTier(organizationId: string): SubscriptionTier {
    return this.tenantTiers.get(organizationId) || SubscriptionTier.PRO;
  }

  public setTenantTier(organizationId: string, tier: SubscriptionTier): void {
    this.tenantTiers.set(organizationId, tier);
    this.logger.log(`Tenant ${organizationId} subscription updated to: ${tier}`);
  }

  async getTenantUsage(tenant: TenantContext): Promise<TenantUsageSummary> {
    const tier = this.getTenantTier(tenant.organizationId);
    const quota = SUBSCRIPTION_TIERS[tier];

    // Calculate start and end of current month
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let queryCount = 0;
    let tokenCount = 0;
    let documentCount = 0;

    try {
      const logs = await this.prisma.client.queryLog.findMany({
        where: {
          organizationId: tenant.organizationId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        select: {
          totalTokens: true,
        },
      });

      queryCount = logs.length;
      tokenCount = logs.reduce((acc, l) => acc + (l.totalTokens || 0), 0);

      documentCount = await this.prisma.client.document.count({
        where: {
          organizationId: tenant.organizationId,
        },
      });
    } catch (err) {
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

  async upgradeSubscription(
    tenant: TenantContext,
    targetTier: SubscriptionTier,
  ): Promise<{ success: boolean; message: string; tier: SubscriptionTier }> {
    this.setTenantTier(tenant.organizationId, targetTier);
    return {
      success: true,
      message: `Successfully upgraded organization subscription to ${targetTier}`,
      tier: targetTier,
    };
  }
}
