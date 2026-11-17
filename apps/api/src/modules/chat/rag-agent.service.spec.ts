import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagAgentService } from './rag-agent.service';
import { DocumentSource, TenantContext, UserRole } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AgentToolsService } from './tools/agent-tools.service';

describe('RagAgentService', () => {
  let service: RagAgentService;
  let mockPrisma: any;
  let mockTools: any;

  const tenant: TenantContext = {
    organizationId: 'org-test-99',
    userId: 'user-01',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@company.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        queryLog: {
          create: vi.fn().mockResolvedValue({ id: 'log-uuid-123' }),
        },
      },
    };
    mockTools = {
      searchKnowledgeBase: vi.fn(),
      lookupTeamContact: vi.fn().mockResolvedValue({
        name: 'IT Helpdesk',
        role: 'Support',
        department: 'IT',
        email: 'it@company.com',
        slackHandle: '@helpdesk',
      }),
    };

    service = new RagAgentService(
      mockPrisma as PrismaService,
      mockTools as AgentToolsService,
    );
  });

  function createMockResponse(): { written: string[]; res: any } {
    const written: string[] = [];
    const res = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn((chunk: string) => written.push(chunk)),
      end: vi.fn(),
    };
    return { written, res };
  }

  it('should stream citations and answer tokens for documented inquiry', async () => {
    mockTools.searchKnowledgeBase.mockResolvedValue([
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Company Vacation Policy',
        source: DocumentSource.FILE_UPLOAD,
        snippet: 'Employees are entitled to 20 days paid leave per annum.',
        relevanceScore: 0.98,
      },
    ]);

    const { written, res } = createMockResponse();

    await service.streamChat(
      tenant,
      {
        messages: [{ role: 'user', content: 'How many days of paid leave do I get?' }],
      },
      res,
    );

    // Verify SSE headers set
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');

    // Verify citations event was sent
    const citationsChunk = written.find((c) => c.includes('"type":"citations"'));
    expect(citationsChunk).toBeDefined();
    expect(citationsChunk).toContain('Company Vacation Policy');

    // Verify completion was saved to QueryLog
    expect(mockPrisma.client.queryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-test-99',
        userId: 'user-01',
        query: 'How many days of paid leave do I get?',
      }),
    });

    // Verify stream ended cleanly
    expect(res.end).toHaveBeenCalled();
  });

  it('should fall back gracefully to team contact tool when no citations match query', async () => {
    mockTools.searchKnowledgeBase.mockResolvedValue([]);

    const { written, res } = createMockResponse();

    await service.streamChat(
      tenant,
      {
        messages: [{ role: 'user', content: 'Can I expense my personal scuba diving lesson?' }],
      },
      res,
    );

    const reconstructed = written
      .filter((c) => c.includes('"type":"token"'))
      .map((c) => {
        try {
          return JSON.parse(c.replace('data: ', '').trim()).content;
        } catch {
          return '';
        }
      })
      .join('');

    expect(reconstructed).toContain('could not find direct information');
    expect(reconstructed).toContain('IT Helpdesk');
    expect(res.end).toHaveBeenCalled();
  });

  it('should dynamically route and record selected model provider (OPENAI / GPT-4o)', async () => {
    mockTools.searchKnowledgeBase.mockResolvedValue([
      {
        chunkId: 'c-gpt',
        documentId: 'd-gpt',
        documentTitle: 'Engineering Architecture',
        source: DocumentSource.NOTION,
        snippet: 'Microservices communicate via gRPC and NATS streaming.',
        relevanceScore: 0.95,
      },
    ]);

    const { res } = createMockResponse();

    await service.streamChat(
      tenant,
      {
        messages: [{ role: 'user', content: 'What protocol is used for microservices?' }],
        modelProvider: 'OPENAI',
        modelName: 'gpt-4o',
      },
      res,
    );

    expect(mockPrisma.client.queryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modelProvider: 'OPENAI',
        modelName: 'gpt-4o',
      }),
    });
    expect(res.end).toHaveBeenCalled();
  });

  it('should dynamically route and record selected model provider (CLAUDE / Sonnet 3.5)', async () => {
    mockTools.searchKnowledgeBase.mockResolvedValue([
      {
        chunkId: 'c-claude',
        documentId: 'd-claude',
        documentTitle: 'Security Whitepaper',
        source: DocumentSource.FILE_UPLOAD,
        snippet: 'All ingress traffic is terminated at Cloudflare edge with strict mTLS.',
        relevanceScore: 0.99,
      },
    ]);

    const { res } = createMockResponse();

    await service.streamChat(
      tenant,
      {
        messages: [{ role: 'user', content: 'How is ingress traffic secured?' }],
        modelProvider: 'CLAUDE',
        modelName: 'claude-3-5-sonnet-20241022',
      },
      res,
    );

    expect(mockPrisma.client.queryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modelProvider: 'CLAUDE',
        modelName: 'claude-3-5-sonnet-20241022',
      }),
    });
    expect(res.end).toHaveBeenCalled();
  });
});
