import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from './feedback.service';
import { FeedbackType, TenantContext, UserRole } from '@knowledge/shared';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockPrisma: any;

  const tenantA: TenantContext = {
    organizationId: 'org-alpha',
    userId: 'user-01',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@alpha.com',
  };

  const tenantB: TenantContext = {
    organizationId: 'org-beta',
    userId: 'user-02',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@beta.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        queryLog: {
          findUnique: vi.fn(),
          count: vi.fn(),
          aggregate: vi.fn(),
          groupBy: vi.fn(),
          findMany: vi.fn(),
        },
        document: {
          count: vi.fn(),
        },
        feedback: {
          create: vi.fn(),
          findMany: vi.fn(),
        },
      },
    };

    service = new FeedbackService(mockPrisma as PrismaService);
  });

  it('should submit feedback successfully for valid tenant query', async () => {
    mockPrisma.client.queryLog.findUnique.mockResolvedValue({
      id: 'log-100',
      organizationId: 'org-alpha',
    });
    mockPrisma.client.feedback.create.mockResolvedValue({
      id: 'fb-200',
    });

    const result = await service.submitFeedback(tenantA, {
      queryLogId: 'log-100',
      feedbackType: FeedbackType.THUMBS_UP,
      comment: 'Accurate and cited directly from HR manual!',
    });

    expect(result.success).toBe(true);
    expect(result.feedbackId).toBe('fb-200');
    expect(mockPrisma.client.feedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        queryLogId: 'log-100',
        userId: 'user-01',
        organizationId: 'org-alpha',
      }),
    });
  });

  it('should BLOCK IDOR when user from Org B attempts to submit feedback for Org A query', async () => {
    mockPrisma.client.queryLog.findUnique.mockResolvedValue({
      id: 'log-alpha-100',
      organizationId: 'org-alpha',
    });

    await expect(
      service.submitFeedback(tenantB, {
        queryLogId: 'log-alpha-100',
        feedbackType: FeedbackType.THUMBS_DOWN,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should compute analytics summary with satisfaction percentage', async () => {
    mockPrisma.client.queryLog.count.mockResolvedValue(40);
    mockPrisma.client.document.count.mockResolvedValue(8);
    mockPrisma.client.queryLog.aggregate.mockResolvedValue({
      _sum: { totalTokens: 12500 },
    });
    mockPrisma.client.feedback.findMany.mockResolvedValue([
      { type: 'THUMBS_UP' },
      { type: 'THUMBS_UP' },
      { type: 'THUMBS_UP' },
      { type: 'THUMBS_DOWN' },
    ]);
    mockPrisma.client.queryLog.groupBy.mockResolvedValue([
      { query: 'VPN setup', _count: { query: 15 } },
      { query: 'Leave policy', _count: { query: 9 } },
    ]);

    const summary = await service.getAnalyticsSummary(tenantA);

    expect(summary.totalQueries).toBe(40);
    expect(summary.totalDocuments).toBe(8);
    expect(summary.totalTokensUsed).toBe(12500);
    // 3 thumbs up out of 4 feedbacks = 75%
    expect(summary.satisfactionRate).toBe(75);
    expect(summary.topQueries).toHaveLength(2);
    expect(summary.topQueries[0].query).toBe('VPN setup');
  });
});
