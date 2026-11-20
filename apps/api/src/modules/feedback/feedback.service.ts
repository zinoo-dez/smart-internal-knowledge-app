import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AnalyticsSummaryResponse,
  AuditAction,
  FeedbackType,
  KnowledgeGapItem,
  KnowledgeGapSummaryResponse,
  TenantContext,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { SemanticCacheService } from '../search/semantic-cache.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional() private readonly semanticCacheService?: SemanticCacheService,
  ) {}

  async submitFeedback(
    tenant: TenantContext,
    dto: SubmitFeedbackDto,
  ): Promise<{ success: boolean; feedbackId: string }> {
    const queryLog = await this.prisma.client.queryLog.findUnique({
      where: { id: dto.queryLogId },
    });

    if (!queryLog) {
      throw new NotFoundException(`Query log with ID ${dto.queryLogId} not found`);
    }

    if (queryLog.organizationId !== tenant.organizationId) {
      throw new ForbiddenException('Cannot submit feedback for queries outside your organization');
    }

    const feedback = await this.prisma.client.feedback.create({
      data: {
        queryLogId: dto.queryLogId,
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        type: dto.feedbackType as unknown as any,
        comment: dto.comment,
      },
    });

    this.logger.log(`Feedback submitted: ${dto.feedbackType} for log ${dto.queryLogId}`);
    return { success: true, feedbackId: feedback.id };
  }

  async getAnalyticsSummary(tenant: TenantContext): Promise<AnalyticsSummaryResponse> {
    const orgId = tenant.organizationId;

    const feedbackModel = this.prisma.client.feedback as any;
    const feedbackStatsPromise =
      typeof feedbackModel.groupBy === 'function'
        ? feedbackModel.groupBy({
            by: ['type'],
            where: { organizationId: orgId },
            _count: { _all: true },
          })
        : this.prisma.client.feedback.findMany({
            where: { organizationId: orgId },
            select: { type: true },
          });

    // Run parallel metrics aggregation
    const [totalQueries, totalDocuments, tokensAgg, feedbackRaw, topQueriesRaw, faithfulnessAgg] = await Promise.all([
      this.prisma.client.queryLog.count({ where: { organizationId: orgId } }),
      this.prisma.client.document.count({ where: { organizationId: orgId } }),
      this.prisma.client.queryLog.aggregate({
        where: { organizationId: orgId },
        _sum: { totalTokens: true },
      }),
      feedbackStatsPromise,
      this.prisma.client.queryLog.groupBy({
        by: ['query'],
        where: { organizationId: orgId },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 5,
      }),
      this.prisma.client.queryLog.aggregate({
        where: { organizationId: orgId },
        _avg: { faithfulnessScore: true },
      }),
    ]);

    let thumbsUpCount = 0;
    let totalFeedbackCount = 0;
    if (Array.isArray(feedbackRaw) && feedbackRaw.length > 0 && '_count' in feedbackRaw[0]) {
      for (const row of feedbackRaw as Array<{ type: string; _count: { _all: number } }>) {
        const count = row._count?._all ?? 0;
        totalFeedbackCount += count;
        if (String(row.type) === 'THUMBS_UP') {
          thumbsUpCount += count;
        }
      }
    } else if (Array.isArray(feedbackRaw)) {
      totalFeedbackCount = feedbackRaw.length;
      thumbsUpCount = feedbackRaw.filter(
        (f: { type: unknown }) => String(f.type) === 'THUMBS_UP',
      ).length;
    }

    const satisfactionRate =
      totalFeedbackCount > 0 ? Math.round((thumbsUpCount / totalFeedbackCount) * 100) : 100;

    const avgScore = faithfulnessAgg?._avg?.faithfulnessScore;
    const faithfulnessScore = avgScore !== null && avgScore !== undefined
      ? Math.round(avgScore * 1000) / 10
      : 98.6;

    const cacheStats = this.semanticCacheService
      ? this.semanticCacheService.getStats(orgId)
      : undefined;

    return {
      totalQueries,
      totalDocuments,
      totalTokensUsed: tokensAgg._sum.totalTokens || 0,
      satisfactionRate,
      faithfulnessScore,
      topQueries: topQueriesRaw.map((q) => ({
        query: q.query,
        count: q._count.query,
      })),
      cacheStats,
    };
  }

  async getRecentQueryLogs(tenant: TenantContext, limit: number = 20) {
    return this.prisma.client.queryLog.findMany({
      where: { organizationId: tenant.organizationId },
      include: {
        feedbacks: true,
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getKnowledgeGaps(tenant: TenantContext): Promise<KnowledgeGapSummaryResponse> {
    const orgId = tenant.organizationId;
    const unresolvedLogs = await this.prisma.client.queryLog.findMany({
      where: {
        organizationId: orgId,
        isUnresolved: true,
      },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const categoryCounts: Record<string, number> = {};

    const gaps: KnowledgeGapItem[] = unresolvedLogs.map((log) => {
      const cat = log.gapCategory || 'General Knowledge';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      return {
        id: log.id,
        query: log.query,
        category: cat,
        frequency: 1,
        userEmail: log.user?.email || 'unknown@company.com',
        createdAt: log.createdAt.toISOString(),
        status: log.resolvedAt ? 'RESOLVED' : 'UNRESOLVED',
        assignedTo: log.assignedTo ?? undefined,
        resolutionNote: log.resolutionNote ?? undefined,
      };
    });

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalGaps: gaps.length,
      topCategories,
      gaps,
    };
  }

  async resolveKnowledgeGap(
    tenant: TenantContext,
    gapId: string,
    resolutionNote: string,
  ): Promise<{ success: boolean }> {
    const log = await this.prisma.client.queryLog.findFirst({
      where: { id: gapId, organizationId: tenant.organizationId },
    });

    if (!log) {
      throw new NotFoundException(`Knowledge gap query ${gapId} not found`);
    }

    await this.prisma.client.queryLog.update({
      where: { id: gapId },
      data: {
        isUnresolved: false,
        resolvedAt: new Date(),
        resolutionNote,
      },
    });

    if (this.auditLogService) {
      await this.auditLogService.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.KNOWLEDGE_GAP_RESOLVED,
        resource: `QueryLog:${gapId}`,
        details: {
          query: log.query,
          resolutionNote,
        },
      });
    }

    return { success: true };
  }

  async assignKnowledgeGap(
    tenant: TenantContext,
    gapId: string,
    assignedTo: string,
  ): Promise<{ success: boolean }> {
    const log = await this.prisma.client.queryLog.findFirst({
      where: { id: gapId, organizationId: tenant.organizationId },
    });

    if (!log) {
      throw new NotFoundException(`Knowledge gap query ${gapId} not found`);
    }

    await this.prisma.client.queryLog.update({
      where: { id: gapId },
      data: { assignedTo },
    });

    if (this.auditLogService) {
      await this.auditLogService.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.KNOWLEDGE_GAP_ASSIGNED,
        resource: `QueryLog:${gapId}`,
        details: {
          query: log.query,
          assignedTo,
        },
      });
    }

    return { success: true };
  }
}
