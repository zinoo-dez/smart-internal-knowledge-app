import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridSearchService } from './hybrid-search.service';
import { DocumentSource, TenantContext, UserRole } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../documents/services/embedding.service';

describe('HybridSearchService (pgvector + tsvector RRF)', () => {
  let service: HybridSearchService;
  let mockPrisma: any;
  let mockEmbeddingService: any;

  const tenant: TenantContext = {
    organizationId: 'org-test-77',
    userId: 'user-01',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@company.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        $queryRawUnsafe: vi.fn(),
        documentChunk: {
          findMany: vi.fn(),
        },
      },
    };
    mockEmbeddingService = {
      embedText: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
    };

    service = new HybridSearchService(
      mockPrisma as PrismaService,
      mockEmbeddingService as EmbeddingService,
    );
  });

  it('should execute raw SQL hybrid search and map ranked citations with RRF scores', async () => {
    mockPrisma.client.$queryRawUnsafe.mockResolvedValue([
      {
        chunk_id: 'c1',
        document_id: 'd1',
        document_title: 'VPN Setup Guide',
        source: 'FILE_UPLOAD',
        source_url: null,
        snippet: 'Download Wireguard from company intranet...',
        relevance_score: 0.0327, // 1/(60+1) + 1/(60+1)
      },
      {
        chunk_id: 'c2',
        document_id: 'd2',
        document_title: 'Remote Work Security',
        source: 'NOTION',
        source_url: 'https://notion.so/security',
        snippet: 'Always enable 2FA on Google Workspace...',
        relevance_score: 0.0163, // 1/(60+1)
      },
    ]);

    const response = await service.search(tenant, {
      query: 'how to setup VPN',
      topK: 2,
    });

    expect(response.citations).toHaveLength(2);
    expect(response.citations[0].documentTitle).toBe('VPN Setup Guide');
    expect(response.citations[0].chunkId).toBe('c1');
    expect(response.citations[0].relevanceScore).toBeCloseTo(0.0327, 4);

    // Verify tenant organization ID and department ACLs were strictly passed to SQL
    expect(mockPrisma.client.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WITH vector_matches AS'),
      expect.any(String), // vector string
      'org-test-77',       // tenant organizationId
      expect.any(Number), // candidateLimit
      'how to setup VPN', // query
      2,                  // topK
      'ALL',              // userDept
      false,              // isAdmin
    );
  });

  it('should enforce department ACL isolation for engineering employees', async () => {
    const engineeringTenant: TenantContext = {
      organizationId: 'org-test-77',
      userId: 'eng-01',
      userRole: UserRole.MEMBER,
      userEmail: 'alice@eng.company.com',
      department: 'ENGINEERING' as any,
    };

    mockPrisma.client.$queryRawUnsafe.mockResolvedValue([]);

    await service.search(engineeringTenant, {
      query: 'compensation benchmarks',
      topK: 3,
    });

    expect(mockPrisma.client.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('(c.department = \'ALL\' OR c.department::text = $6 OR $7 = true)'),
      expect.any(String),
      'org-test-77',
      expect.any(Number),
      'compensation benchmarks',
      3,
      'ENGINEERING', // user department passed strictly
      false,         // member is not admin
    );
  });

  it('should grant cross-department bypass for ADMIN users', async () => {
    const adminTenant: TenantContext = {
      organizationId: 'org-test-77',
      userId: 'admin-01',
      userRole: UserRole.ADMIN,
      userEmail: 'boss@company.com',
      department: 'EXECUTIVE' as any,
    };

    mockPrisma.client.$queryRawUnsafe.mockResolvedValue([]);

    await service.search(adminTenant, {
      query: 'confidential report',
      topK: 5,
    });

    expect(mockPrisma.client.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WITH vector_matches AS'),
      expect.any(String),
      'org-test-77',
      expect.any(Number),
      'confidential report',
      5,
      'EXECUTIVE',
      true, // isAdmin bypass is true
    );
  });

  it('should use resilient fallback query when raw vector query fails', async () => {
    mockPrisma.client.$queryRawUnsafe.mockRejectedValue(new Error('Extension vector not ready'));
    mockPrisma.client.documentChunk.findMany.mockResolvedValue([
      {
        id: 'c-fallback',
        documentId: 'd-fallback',
        content: 'Fallback content for keyword match',
        document: {
          title: 'Emergency Fallback Doc',
          source: 'FILE_UPLOAD',
          sourceUrl: null,
        },
      },
    ]);

    const response = await service.search(tenant, {
      query: 'emergency',
      topK: 1,
    });

    expect(response.citations).toHaveLength(1);
    expect(response.citations[0].documentTitle).toBe('Emergency Fallback Doc');
    expect(response.citations[0].snippet).toBe('Fallback content for keyword match');
  });
});
