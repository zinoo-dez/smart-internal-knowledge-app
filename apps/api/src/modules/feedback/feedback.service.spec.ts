import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from './feedback.service';
import { FeedbackType, TenantContext, UserRole } from '@knowledge/shared';
import { ForbiddenException } from '@nestjs/common';
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

  it('should retrieve knowledge gaps with categorized summary', async () => {
    mockPrisma.client.queryLog.findMany.mockResolvedValue([
      {
        id: 'gap-1',
        query: 'What is our 2026 paternity leave duration?',
        gapCategory: 'HR & Policies',
        createdAt: new Date('2026-01-02T10:00:00Z'),
        resolvedAt: null,
        user: { email: 'alice@company.com' },
      },
      {
        id: 'gap-2',
        query: 'How to request static IP in VPC?',
        gapCategory: 'Engineering Architecture',
        createdAt: new Date('2026-01-02T11:00:00Z'),
        resolvedAt: null,
        user: { email: 'bob@company.com' },
      },
    ]);

    const gapsRes = await service.getKnowledgeGaps(tenantA);
    expect(gapsRes.totalGaps).toBe(2);
    expect(gapsRes.topCategories).toHaveLength(2);
    expect(gapsRes.gaps[0].query).toBe('What is our 2026 paternity leave duration?');
    expect(gapsRes.gaps[0].category).toBe('HR & Policies');
    expect(gapsRes.gaps[0].status).toBe('UNRESOLVED');
  });

  it('should resolve a knowledge gap with documentation note', async () => {
    mockPrisma.client.queryLog.findFirst = vi.fn().mockResolvedValue({
      id: 'gap-1',
      organizationId: 'org-alpha',
    });
    mockPrisma.client.queryLog.update = vi.fn().mockResolvedValue({
      id: 'gap-1',
      isUnresolved: false,
    });

    const res = await service.resolveKnowledgeGap(
      tenantA,
      'gap-1',
      'Authored 2026 Paternity policy in Notion and synced to KB',
    );

    expect(res.success).toBe(true);
    expect(mockPrisma.client.queryLog.update).toHaveBeenCalledWith({
      where: { id: 'gap-1' },
      data: expect.objectContaining({
        isUnresolved: false,
        resolutionNote: 'Authored 2026 Paternity policy in Notion and synced to KB',
      }),
    });
  });

  it('should assign a knowledge gap to a department lead', async () => {
    mockPrisma.client.queryLog.findFirst = vi.fn().mockResolvedValue({
      id: 'gap-2',
      organizationId: 'org-alpha',
    });
    mockPrisma.client.queryLog.update = vi.fn().mockResolvedValue({
      id: 'gap-2',
      assignedTo: 'sarah.lead@company.com',
    });

    const res = await service.assignKnowledgeGap(
      tenantA,
      'gap-2',
      'sarah.lead@company.com',
    );

    expect(res.success).toBe(true);
    expect(mockPrisma.client.queryLog.update).toHaveBeenCalledWith({
      where: { id: 'gap-2' },
      data: { assignedTo: 'sarah.lead@company.com' },
    });
  });

  it('should return honest 0 metrics on an empty workspace instead of fabricated defaults', async () => {
    mockPrisma.client.queryLog.count.mockResolvedValue(0);
    mockPrisma.client.document.count.mockResolvedValue(0);
    mockPrisma.client.queryLog.aggregate
      .mockResolvedValueOnce({ _sum: { totalTokens: null } })
      .mockResolvedValueOnce({ _avg: { faithfulnessScore: null } });
    mockPrisma.client.feedback.findMany.mockResolvedValue([]);
    mockPrisma.client.queryLog.groupBy.mockResolvedValue([]);

    const summary = await service.getAnalyticsSummary(tenantA);
    expect(summary.totalQueries).toBe(0);
    expect(summary.satisfactionRate).toBe(0);
    expect(summary.faithfulnessScore).toBe(0);
  });

  it('should cluster duplicate unresolved queries and aggregate real frequency counts', async () => {
    mockPrisma.client.queryLog.findMany.mockResolvedValue([
      {
        id: 'gap-a1',
        query: '  How to request VPN access? ',
        gapCategory: 'IT & Infrastructure',
        createdAt: new Date('2026-01-03T10:00:00Z'),
        resolvedAt: null,
        user: { email: 'alice@company.com' },
      },
      {
        id: 'gap-a2',
        query: 'how to request   vpn access?',
        gapCategory: 'IT & Infrastructure',
        createdAt: new Date('2026-01-03T11:00:00Z'),
        resolvedAt: null,
        user: { email: 'bob@company.com' },
      },
      {
        id: 'gap-b1',
        query: 'Parental leave policy',
        gapCategory: 'HR & Policies',
        createdAt: new Date('2026-01-03T12:00:00Z'),
        resolvedAt: null,
        user: { email: 'carol@company.com' },
      },
    ]);

    const res = await service.getKnowledgeGaps(tenantA);
    expect(res.totalGaps).toBe(3);
    expect(res.gaps).toHaveLength(2);
    expect(res.gaps[0].query.trim()).toBe('How to request VPN access?');
    expect(res.gaps[0].frequency).toBe(2);
    expect(res.gaps[1].frequency).toBe(1);
  });
});
