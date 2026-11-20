import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  Department,
  DocumentSource,
  FeedbackType,
  IngestionStatus,
  SubscriptionTier,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '@knowledge/shared';
import { GlobalExceptionsFilter } from '../common/filters/http-exception.filter';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { ClerkAuthGuard } from '../modules/auth/guards/clerk-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { BillingController } from '../modules/billing/billing.controller';
import { BillingService } from '../modules/billing/billing.service';
import { ChatController } from '../modules/chat/chat.controller';
import { ConversationsService } from '../modules/chat/conversations.service';
import { RagAgentService } from '../modules/chat/rag-agent.service';
import { AgentToolsService } from '../modules/chat/tools/agent-tools.service';
import { DocumentsController } from '../modules/documents/documents.controller';
import { DocumentsService } from '../modules/documents/documents.service';
import { DataSanitizerService } from '../modules/documents/services/data-sanitizer.service';
import { EmbeddingService } from '../modules/documents/services/embedding.service';
import { IngestionProcessor } from '../modules/documents/workers/ingestion.processor';
import { FeedbackController } from '../modules/feedback/feedback.controller';
import { FeedbackService } from '../modules/feedback/feedback.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { HybridSearchService } from '../modules/search/hybrid-search.service';
import { SearchController } from '../modules/search/search.controller';

interface StoredDocument {
  id: string;
  organizationId: string;
  title: string;
  source: DocumentSource;
  department: Department;
  sourceUrl: string | null;
  mimeType: string;
  status: IngestionStatus;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { chunks: number };
}

interface StoredConversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    citations: unknown;
    queryLogId: string | null;
    createdAt: Date;
  }>;
}

interface StoredQueryLog {
  id: string;
  organizationId: string;
  query: string;
  totalTokens: number;
  faithfulnessScore: number | null;
  isUnresolved: boolean;
  gapCategory: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  assignedTo?: string;
  user?: { email: string };
}

interface RawSearchRow {
  chunk_id: string;
  document_id: string;
  document_title: string;
  source: string;
  source_url: string | null;
  snippet: string;
  relevance_score: number;
}

describe('Main Features HTTP Integration & Security Suite (Supertest)', () => {
  let app: INestApplication;
  let adminToken: string;

  let documentsStore: StoredDocument[];
  let conversationsStore: StoredConversation[];
  let queryLogsStore: StoredQueryLog[];
  let feedbackCount: number;
  let ticketCounter: number;

  const mockEmbeddingService = {
    embedText: vi.fn<() => Promise<number[]>>(),
  };

  const mockRagAgentService = {
    streamChat: vi.fn(),
  };

  const mockPrismaClient = {
    organization: {
      upsert: vi.fn(async (args: { where: { clerkOrgId: string } }) => ({
        id: args.where.clerkOrgId === 'org-beta' ? 'org-beta-id' : 'org-alpha-id',
        clerkOrgId: args.where.clerkOrgId,
      })),
    },
    user: {
      upsert: vi.fn(
        async (args: {
          where: { clerkUserId: string };
          create: { email: string; role: UserRole; organizationId: string };
        }) => {
          const clerkId = args.where.clerkUserId;
          const dept = clerkId.includes('eng') ? Department.ENGINEERING : Department.ALL;
          const role = clerkId.includes('member') ? UserRole.MEMBER : args.create.role;
          return {
            id: `db-${clerkId}`,
            clerkUserId: clerkId,
            organizationId: args.create.organizationId,
            email: args.create.email,
            role,
            department: dept,
          };
        },
      ),
    },
    document: {
      create: vi.fn(
        async (args: {
          data: {
            organizationId: string;
            title: string;
            source: DocumentSource;
            department: Department;
            sourceUrl?: string;
            mimeType: string;
            status: IngestionStatus;
          };
        }) => {
          const doc: StoredDocument = {
            id: `doc-${documentsStore.length + 1}`,
            organizationId: args.data.organizationId,
            title: args.data.title,
            source: args.data.source,
            department: args.data.department,
            sourceUrl: args.data.sourceUrl ?? null,
            mimeType: args.data.mimeType,
            status: args.data.status,
            metadata: null,
            errorMessage: null,
            createdAt: new Date('2026-11-20T00:00:00Z'),
            updatedAt: new Date('2026-11-20T00:00:00Z'),
            _count: { chunks: 0 },
          };
          documentsStore.push(doc);
          return doc;
        },
      ),
      findMany: vi.fn(
        async (args: { where: { organizationId: string; OR?: Array<{ department: Department }> } }) => {
          return documentsStore.filter((doc) => {
            if (doc.organizationId !== args.where.organizationId) return false;
            if (!args.where.OR) return true;
            return args.where.OR.some((clause) => doc.department === clause.department);
          });
        },
      ),
      findUnique: vi.fn(async (args: { where: { id: string } }) => {
        return documentsStore.find((doc) => doc.id === args.where.id) ?? null;
      }),
      delete: vi.fn(async (args: { where: { id: string } }) => {
        const idx = documentsStore.findIndex((doc) => doc.id === args.where.id);
        const [removed] = documentsStore.splice(idx, 1);
        return removed;
      }),
      count: vi.fn(async (args: { where: { organizationId: string } }) => {
        return documentsStore.filter((d) => d.organizationId === args.where.organizationId).length;
      }),
    },
    documentChunk: {
      findMany: vi.fn(async () => [
        {
          id: 'chunk-fallback-1',
          documentId: 'doc-1',
          content: 'WireGuard VPN onboarding guide for engineering.',
          metadata: { clearanceLevel: 'INTERNAL' },
          document: {
            title: 'Engineering VPN Guide',
            source: DocumentSource.FILE_UPLOAD,
            sourceUrl: 'https://docs.company.internal/vpn',
          },
        },
        {
          id: 'chunk-walled-2',
          documentId: 'doc-2',
          content: 'Executive M&A WireGuard note.',
          metadata: {
            clearanceLevel: 'RESTRICTED',
            ethicalWallBlockedUsers: ['db-member-eng-01'],
          },
          document: {
            title: 'Confidential M&A',
            source: DocumentSource.NOTION,
            sourceUrl: null,
          },
        },
      ]),
    },
    $queryRawUnsafe: vi.fn<() => Promise<RawSearchRow[]>>(),
    conversation: {
      findMany: vi.fn(async (args: { where: { organizationId: string; userId: string } }) => {
        return conversationsStore
          .filter(
            (c) => c.organizationId === args.where.organizationId && c.userId === args.where.userId,
          )
          .map((c) => ({
            ...c,
            _count: { messages: c.messages.length },
          }));
      }),
      findFirst: vi.fn(async (args: { where: { id: string; organizationId: string } }) => {
        return (
          conversationsStore.find(
            (c) => c.id === args.where.id && c.organizationId === args.where.organizationId,
          ) ?? null
        );
      }),
      delete: vi.fn(async (args: { where: { id: string } }) => {
        const idx = conversationsStore.findIndex((c) => c.id === args.where.id);
        const [removed] = conversationsStore.splice(idx, 1);
        return removed;
      }),
    },
    queryLog: {
      findMany: vi.fn(async (args: { where?: { organizationId?: string; isUnresolved?: boolean } }) => {
        return queryLogsStore.filter((q) => {
          if (args.where?.organizationId && q.organizationId !== args.where.organizationId) {
            return false;
          }
          if (args.where?.isUnresolved !== undefined && q.isUnresolved !== args.where.isUnresolved) {
            return false;
          }
          return true;
        });
      }),
      findUnique: vi.fn(async (args: { where: { id: string } }) => {
        return queryLogsStore.find((q) => q.id === args.where.id) ?? null;
      }),
      findFirst: vi.fn(async (args: { where: { id: string; organizationId: string } }) => {
        return (
          queryLogsStore.find(
            (q) => q.id === args.where.id && q.organizationId === args.where.organizationId,
          ) ?? null
        );
      }),
      update: vi.fn(
        async (args: { where: { id: string }; data: { assignedTo?: string; isUnresolved?: boolean } }) => {
          const item = queryLogsStore.find((q) => q.id === args.where.id);
          if (item) {
            if (args.data.assignedTo !== undefined) item.assignedTo = args.data.assignedTo;
            if (args.data.isUnresolved !== undefined) item.isUnresolved = args.data.isUnresolved;
          }
          return item;
        },
      ),
      count: vi.fn(async (args: { where: { organizationId: string } }) => {
        return queryLogsStore.filter((q) => q.organizationId === args.where.organizationId).length;
      }),
      aggregate: vi.fn(async (args: { where: { organizationId: string } }) => {
        const rows = queryLogsStore.filter((q) => q.organizationId === args.where.organizationId);
        const totalTokens = rows.reduce((sum, r) => sum + r.totalTokens, 0);
        const scored = rows.filter((r) => r.faithfulnessScore !== null);
        const avgFaith =
          scored.length > 0
            ? scored.reduce((sum, r) => sum + (r.faithfulnessScore ?? 0), 0) / scored.length
            : null;
        return {
          _count: { _all: rows.length },
          _sum: { totalTokens },
          _avg: { faithfulnessScore: avgFaith },
        };
      }),
      groupBy: vi.fn(async () => [{ query: 'What is our VPN policy?', _count: { query: 3 } }]),
    },
    feedback: {
      create: vi.fn(
        async (args: {
          data: {
            queryLogId: string;
            userId: string;
            organizationId: string;
            type: FeedbackType;
            comment?: string;
          };
        }) => {
          feedbackCount += 1;
          return { id: `fb-${feedbackCount}`, ...args.data };
        },
      ),
      groupBy: vi.fn(async () => [{ type: FeedbackType.THUMBS_UP, _count: { _all: 4 } }]),
    },
    supportTicket: {
      create: vi.fn(
        async (args: {
          data: {
            organizationId: string;
            userId: string;
            title: string;
            description: string;
            priority: string;
            category: string;
          };
        }) => {
          ticketCounter += 1;
          return { id: `tkt-0000000${ticketCounter}`, ...args.data };
        },
      ),
      count: vi.fn(async () => ticketCounter),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        BillingController,
        SearchController,
        DocumentsController,
        ChatController,
        FeedbackController,
      ],
      providers: [
        { provide: PrismaService, useValue: { client: mockPrismaClient } },
        AuthService,
        ClerkAuthGuard,
        RolesGuard,
        BillingService,
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        HybridSearchService,
        DataSanitizerService,
        {
          provide: IngestionProcessor,
          useValue: { processDocument: vi.fn().mockResolvedValue(undefined) },
        },
        DocumentsService,
        ConversationsService,
        AgentToolsService,
        { provide: RagAgentService, useValue: mockRagAgentService },
        FeedbackService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const sessionRes = await request(app.getHttpServer()).post('/api/auth/demo-session').expect(201);
    adminToken = sessionRes.body.token as string;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackCount = 0;
    ticketCounter = 0;
    mockEmbeddingService.embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    mockPrismaClient.$queryRawUnsafe.mockResolvedValue([
      {
        chunk_id: 'chunk-1',
        document_id: 'doc-1',
        document_title: 'Engineering VPN Guide',
        source: DocumentSource.FILE_UPLOAD,
        source_url: 'https://docs.company.internal/vpn',
        snippet: 'Connect via WireGuard VPN.',
        relevance_score: 0.94,
      },
    ]);

    documentsStore = [
      {
        id: 'doc-1',
        organizationId: 'org-alpha-id',
        title: 'Engineering VPN Guide',
        source: DocumentSource.FILE_UPLOAD,
        department: Department.ENGINEERING,
        sourceUrl: 'https://docs.company.internal/vpn',
        mimeType: 'text/markdown',
        status: IngestionStatus.INDEXED,
        metadata: null,
        errorMessage: null,
        createdAt: new Date('2026-11-20T00:00:00Z'),
        updatedAt: new Date('2026-11-20T00:00:00Z'),
        _count: { chunks: 4 },
      },
      {
        id: 'doc-hr-secret',
        organizationId: 'org-alpha-id',
        title: 'HR Compensation Bands',
        source: DocumentSource.NOTION,
        department: Department.HR,
        sourceUrl: null,
        mimeType: 'text/plain',
        status: IngestionStatus.INDEXED,
        metadata: null,
        errorMessage: null,
        createdAt: new Date('2026-11-20T00:00:00Z'),
        updatedAt: new Date('2026-11-20T00:00:00Z'),
        _count: { chunks: 2 },
      },
      {
        id: 'doc-beta-org',
        organizationId: 'org-beta-id',
        title: 'Beta Tenant Roadmap',
        source: DocumentSource.CONFLUENCE,
        department: Department.ALL,
        sourceUrl: null,
        mimeType: 'text/plain',
        status: IngestionStatus.INDEXED,
        metadata: null,
        errorMessage: null,
        createdAt: new Date('2026-11-20T00:00:00Z'),
        updatedAt: new Date('2026-11-20T00:00:00Z'),
        _count: { chunks: 3 },
      },
    ];

    conversationsStore = [
      {
        id: 'conv-member-1',
        organizationId: 'org-alpha-id',
        userId: 'db-member-eng-01',
        title: 'VPN Troubleshooting',
        createdAt: new Date('2026-11-20T01:00:00Z'),
        updatedAt: new Date('2026-11-20T01:05:00Z'),
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'How do I set up WireGuard?',
            citations: null,
            queryLogId: null,
            createdAt: new Date('2026-11-20T01:00:00Z'),
          },
        ],
      },
      {
        id: 'conv-other-user',
        organizationId: 'org-alpha-id',
        userId: 'db-other-user-02',
        title: 'Private HR Inquiry',
        createdAt: new Date('2026-11-20T01:00:00Z'),
        updatedAt: new Date('2026-11-20T01:05:00Z'),
        messages: [],
      },
    ];

    queryLogsStore = [
      {
        id: 'log-alpha-1',
        organizationId: 'org-alpha-id',
        query: 'What is our VPN policy?',
        totalTokens: 450,
        faithfulnessScore: 0.96,
        isUnresolved: true,
        gapCategory: 'IT & Infrastructure',
        createdAt: new Date('2026-11-20T02:00:00Z'),
        resolvedAt: null,
        user: { email: 'member@company.internal' },
      },
      {
        id: 'log-beta-1',
        organizationId: 'org-beta-id',
        query: 'Beta confidential query',
        totalTokens: 900,
        faithfulnessScore: 0.88,
        isUnresolved: false,
        gapCategory: null,
        createdAt: new Date('2026-11-20T02:00:00Z'),
        resolvedAt: null,
        user: { email: 'beta@other.internal' },
      },
    ];
  });

  describe('1. Billing & Subscription Quotas (/api/billing)', () => {
    it('returns 401 when unauthenticated on GET /api/billing/usage', async () => {
      await request(app.getHttpServer()).get('/api/billing/usage').expect(401);
    });

    it('returns subscription tiers and computed tenant usage metrics', async () => {
      const tiersRes = await request(app.getHttpServer())
        .get('/api/billing/tiers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(tiersRes.body.FREE.maxMonthlyQueries).toBe(100);
      expect(tiersRes.body.PRO.maxMonthlyQueries).toBe(2500);
      expect(tiersRes.body.ENTERPRISE.maxMonthlyQueries).toBe(50000);

      const usageRes = await request(app.getHttpServer())
        .get('/api/billing/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usageRes.body).toMatchObject({
        tier: SubscriptionTier.PRO,
        queryCount: 1,
        tokenCount: 450,
        documentCount: 2,
        isQuotaExceeded: false,
      });
    });

    it('enforces ADMIN RBAC and DTO validation on POST /api/billing/upgrade', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/upgrade')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .send({ tier: SubscriptionTier.ENTERPRISE })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tier: 'PLATINUM_UNLIMITED' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tier: SubscriptionTier.ENTERPRISE, organizationId: 'org-beta-id' })
        .expect(400);

      const upgradeRes = await request(app.getHttpServer())
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tier: SubscriptionTier.ENTERPRISE })
        .expect(201);

      expect(upgradeRes.body.tier).toBe(SubscriptionTier.ENTERPRISE);

      const updatedUsage = await request(app.getHttpServer())
        .get('/api/billing/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(updatedUsage.body.tier).toBe(SubscriptionTier.ENTERPRISE);
      expect(updatedUsage.body.queryLimit).toBe(50000);
    });
  });

  describe('2. Hybrid Search & ABAC Ethical Wall Fallback (/api/search)', () => {
    it('returns 401 when unauthenticated and 400 on boundary violations', async () => {
      await request(app.getHttpServer())
        .post('/api/search')
        .send({ query: 'VPN' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: '' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: 'VPN', topK: 25 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: 'VPN', minScore: 1.5 })
        .expect(400);
    });

    it('returns grounded citations from hybrid search and enforces ethical-wall fallback on embedding failure', async () => {
      const happyRes = await request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: 'WireGuard VPN', topK: 5 })
        .expect(201);

      expect(happyRes.body.citations).toHaveLength(1);
      expect(happyRes.body.citations[0]).toMatchObject({
        chunkId: 'chunk-1',
        documentTitle: 'Engineering VPN Guide',
        relevanceScore: 0.94,
      });

      // Simulate external embedding API failure -> must degrade gracefully and still block walled chunks
      mockEmbeddingService.embedText.mockRejectedValueOnce(new Error('Gemini embedding timeout'));
      const fallbackRes = await request(app.getHttpServer())
        .post('/api/search')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .send({ query: 'WireGuard', topK: 5 })
        .expect(201);

      expect(fallbackRes.body.citations).toHaveLength(1);
      expect(fallbackRes.body.citations[0].chunkId).toBe('chunk-fallback-1');
    });
  });

  describe('3. Documents Lifecycle, Upload & Department ACLs (/api/documents)', () => {
    it('enforces auth, file presence, valid markdown upload, and DB persistence', async () => {
      await request(app.getHttpServer()).get('/api/documents').expect(401);

      await request(app.getHttpServer())
        .post('/api/documents/upload/file')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      const uploadRes = await request(app.getHttpServer())
        .post('/api/documents/upload/file')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Runbook Release Notes')
        .attach('file', Buffer.from('# Runbook\nAlways verify migrations.'), 'runbook.md')
        .expect(201);

      expect(uploadRes.body).toMatchObject({
        documentId: 'doc-4',
        status: IngestionStatus.PENDING,
      });
      expect(documentsStore.some((d) => d.id === 'doc-4' && d.title === 'Runbook Release Notes')).toBe(
        true,
      );
    });

    it('enforces cross-tenant IDOR, department ACLs, and ADMIN-only deletion', async () => {
      // Cross-tenant IDOR blocked
      await request(app.getHttpServer())
        .get('/api/documents/doc-beta-org')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      // Non-admin engineering member blocked from HR-only doc
      await request(app.getHttpServer())
        .get('/api/documents/doc-hr-secret')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(403);

      // Missing document returns 404
      await request(app.getHttpServer())
        .get('/api/documents/doc-does-not-exist')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // MEMBER cannot delete document (403, DB untouched)
      await request(app.getHttpServer())
        .delete('/api/documents/doc-1')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(403);
      expect(mockPrismaClient.document.delete).not.toHaveBeenCalled();

      // ADMIN deletes own org document (200, DB updated)
      const delRes = await request(app.getHttpServer())
        .delete('/api/documents/doc-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(delRes.body).toEqual({ success: true });
      expect(documentsStore.some((d) => d.id === 'doc-1')).toBe(false);
    });
  });

  describe('4. Conversations & Support Ticket HTTP Lifecycle (/api/chat)', () => {
    it('enforces auth and per-user ownership on conversation list, detail, and delete', async () => {
      await request(app.getHttpServer()).get('/api/chat/conversations').expect(401);

      const listRes = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(200);

      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].id).toBe('conv-member-1');

      const detailRes = await request(app.getHttpServer())
        .get('/api/chat/conversations/conv-member-1')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(200);
      expect(detailRes.body.messages).toHaveLength(1);
      expect(detailRes.body.messages[0].content).toBe('How do I set up WireGuard?');

      // IDOR: MEMBER cannot read or delete another user's conversation
      await request(app.getHttpServer())
        .get('/api/chat/conversations/conv-other-user')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(403);

      await request(app.getHttpServer())
        .delete('/api/chat/conversations/conv-other-user')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(403);

      // Missing conversation returns 404
      await request(app.getHttpServer())
        .get('/api/chat/conversations/conv-missing')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(404);

      // Owner deletes own conversation
      const delRes = await request(app.getHttpServer())
        .delete('/api/chat/conversations/conv-member-1')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(200);
      expect(delRes.body).toEqual({ success: true });
      expect(conversationsStore.some((c) => c.id === 'conv-member-1')).toBe(false);
    });

    it('creates support ticket and persists record on valid POST /api/chat/tools/ticket', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/tools/ticket')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .send({
          title: 'VPN certificate expired',
          description: 'Need renewed WireGuard profile',
          priority: TicketPriority.HIGH,
          category: TicketCategory.IT,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        ticketId: 'tkt-00000001',
        status: TicketStatus.OPEN,
      });
      expect(mockPrismaClient.supportTicket.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Feedback, Analytics & Knowledge Gaps (/api/feedback)', () => {
    it('validates feedback payload, blocks cross-org IDOR, and persists feedback', async () => {
      await request(app.getHttpServer())
        .post('/api/feedback')
        .send({ queryLogId: 'log-alpha-1', feedbackType: FeedbackType.THUMBS_UP })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ queryLogId: 'log-alpha-1', feedbackType: 'INVALID_VOTE' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ queryLogId: 'log-missing', feedbackType: FeedbackType.THUMBS_UP })
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ queryLogId: 'log-beta-1', feedbackType: FeedbackType.THUMBS_UP })
        .expect(403);

      const okRes = await request(app.getHttpServer())
        .post('/api/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          queryLogId: 'log-alpha-1',
          feedbackType: FeedbackType.THUMBS_UP,
          comment: 'Accurate policy reference',
        })
        .expect(201);

      expect(okRes.body).toEqual({ success: true, feedbackId: 'fb-1' });
      expect(mockPrismaClient.feedback.create).toHaveBeenCalledTimes(1);
    });

    it('restricts analytics and knowledge gap triage endpoints to ADMIN and updates gap state', async () => {
      await request(app.getHttpServer())
        .get('/api/feedback/analytics/summary')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/feedback/knowledge-gaps')
        .set('x-mock-user-id', 'member-eng-01')
        .set('x-mock-role', UserRole.MEMBER)
        .expect(403);

      const summaryRes = await request(app.getHttpServer())
        .get('/api/feedback/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(summaryRes.body).toMatchObject({
        totalQueries: 1,
        totalDocuments: 2,
        totalTokensUsed: 450,
        satisfactionRate: 100,
        faithfulnessScore: 96,
      });

      const gapsRes = await request(app.getHttpServer())
        .get('/api/feedback/knowledge-gaps')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(gapsRes.body.totalGaps).toBe(1);
      expect(gapsRes.body.gaps[0].query).toBe('What is our VPN policy?');
      expect(gapsRes.body.gaps[0].category).toBe('IT & Infrastructure');

      const assignRes = await request(app.getHttpServer())
        .post('/api/feedback/knowledge-gaps/log-alpha-1/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: 'platform-team@company.internal' })
        .expect(201);

      expect(assignRes.body).toEqual({ success: true });
      expect(queryLogsStore[0]?.assignedTo).toBe('platform-team@company.internal');
    });
  });
});
