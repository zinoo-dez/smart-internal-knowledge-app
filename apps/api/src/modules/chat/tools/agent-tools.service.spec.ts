import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentToolsService } from './agent-tools.service';
import { DocumentSource, TenantContext, TicketStatus, UserRole } from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { HybridSearchService } from '../../search/hybrid-search.service';

describe('AgentToolsService', () => {
  let service: AgentToolsService;
  let mockPrisma: any;
  let mockSearch: any;

  const tenant: TenantContext = {
    organizationId: 'org-123',
    userId: 'user-456',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@company.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        supportTicket: {
          create: vi.fn(),
        },
      },
    };
    mockSearch = {
      search: vi.fn(),
    };

    service = new AgentToolsService(
      mockPrisma as PrismaService,
      mockSearch as HybridSearchService,
    );
  });

  it('should delegate searchKnowledgeBase to HybridSearchService', async () => {
    mockSearch.search.mockResolvedValue({
      citations: [
        {
          chunkId: 'c1',
          documentId: 'd1',
          documentTitle: 'VPN Guide',
          source: DocumentSource.FILE_UPLOAD,
          snippet: 'VPN installation details',
          relevanceScore: 0.95,
        },
      ],
    });

    const result = await service.searchKnowledgeBase(tenant, 'VPN setup');
    expect(result).toHaveLength(1);
    expect(result[0].documentTitle).toBe('VPN Guide');
    expect(mockSearch.search).toHaveBeenCalledWith(tenant, {
      query: 'VPN setup',
      topK: 4,
      minScore: 0.01,
    });
  });

  it('should create an internal support ticket with proper tenant isolation', async () => {
    mockPrisma.client.supportTicket.create.mockResolvedValue({
      id: 'ticket-uuid-789',
      organizationId: 'org-123',
      userId: 'user-456',
      title: 'Need database access',
      description: 'Require read access to analytics replica',
      priority: 'HIGH',
      category: 'IT',
      status: 'OPEN',
    });

    const result = await service.createInternalTicket(tenant, {
      title: 'Need database access',
      description: 'Require read access to analytics replica',
      priority: 'HIGH',
      category: 'IT',
    });

    expect(result.ticketId).toBe('ticket-uuid-789');
    expect(result.status).toBe(TicketStatus.OPEN);
    expect(mockPrisma.client.supportTicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-123',
        userId: 'user-456',
        title: 'Need database access',
      }),
    });
  });

  it('should return appropriate team contact for HR inquiry', async () => {
    const contact = await service.lookupTeamContact('parental leave policy');
    expect(contact.department).toBe('Human Resources');
    expect(contact.email).toContain('hr-support');
  });

  it('should return appropriate team contact for Security inquiry', async () => {
    const contact = await service.lookupTeamContact('firewall and vpn credentials');
    expect(contact.department).toContain('Security');
    expect(contact.slackHandle).toBe('@alex-secops');
  });

  it('should summarize meeting notes extracting decisions, action items, and open questions', async () => {
    const sampleRawNotes = `
Sprint 15 Planning Meeting
Agreed: Migrate PostgreSQL to Neon serverless branch for preview deployments
Action: Benchmark pgvector HNSW indexing speed @alex-secops (P1 urgent)
Action: Update onboarding wiki in Confluence @sarah-hr
Question: Will the new indexing require downtime on replica?
`;

    const summary = await service.summarizeMeetingNotes({
      rawNotes: sampleRawNotes,
      meetingTitle: 'Sprint 15 Planning',
    });

    expect(summary.title).toBe('Sprint 15 Planning');
    expect(summary.decisions).toContainEqual(expect.stringContaining('Migrate PostgreSQL to Neon'));
    expect(summary.actionItems.length).toBeGreaterThanOrEqual(2);
    expect(summary.actionItems[0].owner).toBe('alex-secops');
    expect(summary.actionItems[0].priority).toBe('HIGH');
    expect(summary.openQuestions).toContainEqual(expect.stringContaining('downtime on replica'));
    expect(summary.formattedMarkdown).toContain('### 📝 Meeting Summary');
  });
});
