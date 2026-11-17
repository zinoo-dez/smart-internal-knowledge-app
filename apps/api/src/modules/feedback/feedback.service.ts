import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalyticsSummaryResponse,
  FeedbackType,
  TenantContext,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Run parallel metrics aggregation
    const [totalQueries, totalDocuments, tokensAgg, feedbacks, topQueriesRaw] = await Promise.all([
      this.prisma.client.queryLog.count({ where: { organizationId: orgId } }),
      this.prisma.client.document.count({ where: { organizationId: orgId } }),
      this.prisma.client.queryLog.aggregate({
        where: { organizationId: orgId },
        _sum: { totalTokens: true },
      }),
      this.prisma.client.feedback.findMany({
        where: { organizationId: orgId },
        select: { type: true },
      }),
      this.prisma.client.queryLog.groupBy({
        by: ['query'],
        where: { organizationId: orgId },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 5,
      }),
    ]);

    const thumbsUpCount = feedbacks.filter((f) => (f.type as unknown as string) === 'THUMBS_UP').length;
    const satisfactionRate = feedbacks.length > 0
      ? Math.round((thumbsUpCount / feedbacks.length) * 100)
      : 100;

    return {
      totalQueries,
      totalDocuments,
      totalTokensUsed: tokensAgg._sum.totalTokens || 0,
      satisfactionRate,
      topQueries: topQueriesRaw.map((q) => ({
        query: q.query,
        count: q._count.query,
      })),
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
}
