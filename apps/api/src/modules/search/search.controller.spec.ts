import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentCitation,
  DocumentSource,
  SearchQueryResponse,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { HybridSearchService } from './hybrid-search.service';
import { SearchController } from './search.controller';
import { SearchQueryDto } from './dto/search-query.dto';

describe('SearchController - 4-Layer Feature Test Suite', () => {
  let controller: SearchController;
  let mockHybridSearchService: {
    search: ReturnType<typeof vi.fn>;
  };

  const mockTenant: TenantContext = {
    organizationId: 'org-tenant-eng-101',
    userId: 'user-engineer-007',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@company.com',
  };

  const sampleCitation: DocumentCitation = {
    chunkId: 'chunk-vpn-01',
    documentId: 'doc-vpn-01',
    documentTitle: 'Engineering VPN Runbook',
    source: DocumentSource.FILE_UPLOAD,
    snippet: 'WireGuard configuration files can be generated via the internal portal.',
    relevanceScore: 0.95,
  };

  const sampleSearchResponse: SearchQueryResponse = {
    citations: [sampleCitation],
  };

  beforeEach(() => {
    mockHybridSearchService = {
      search: vi.fn(),
    };

    controller = new SearchController(
      mockHybridSearchService as unknown as HybridSearchService,
    );
  });

  // ==========================================
  // Layer 1: Unit Tests (Pure Controller Execution)
  // ==========================================
  describe('Layer 1: Unit Tests (Pure Controller Execution)', () => {
    it('delegates search request to HybridSearchService with tenant context and DTO', async () => {
      mockHybridSearchService.search.mockResolvedValueOnce(sampleSearchResponse);

      const dto: SearchQueryDto = {
        query: 'WireGuard VPN',
        topK: 5,
        minScore: 0.7,
        sourceFilter: [DocumentSource.FILE_UPLOAD],
      };

      const result = await controller.search(mockTenant, dto);

      expect(result).toEqual(sampleSearchResponse);
      expect(mockHybridSearchService.search).toHaveBeenCalledTimes(1);
      expect(mockHybridSearchService.search).toHaveBeenCalledWith(mockTenant, dto);
    });

    it('handles query with default optional parameters correctly', async () => {
      mockHybridSearchService.search.mockResolvedValueOnce({
        citations: [],
      });

      const dto: SearchQueryDto = {
        query: 'Leave policy',
      };

      const result = await controller.search(mockTenant, dto);

      expect(result.citations).toHaveLength(0);
      expect(mockHybridSearchService.search).toHaveBeenCalledWith(mockTenant, dto);
    });
  });

  // ==========================================
  // Layer 2: Feature / Integration Contract
  // ==========================================
  describe('Layer 2: Contract Integrity & Response Shape', () => {
    it('preserves exact SearchQueryResponse contract shape with citation metadata', async () => {
      mockHybridSearchService.search.mockResolvedValueOnce(sampleSearchResponse);

      const dto: SearchQueryDto = { query: 'VPN setup' };
      const response = await controller.search(mockTenant, dto);

      expect(response).toHaveProperty('citations');
      expect(Array.isArray(response.citations)).toBe(true);

      const citation = response.citations[0];
      expect(citation).toMatchObject({
        chunkId: expect.any(String),
        documentId: expect.any(String),
        documentTitle: expect.any(String),
        source: DocumentSource.FILE_UPLOAD,
        snippet: expect.any(String),
        relevanceScore: expect.any(Number),
      });
    });
  });

  // ==========================================
  // Layer 3: Authorization & Security Cases
  // ==========================================
  describe('Layer 3: Security, Guard & Rate-Limiting Metadata', () => {
    it('has ClerkAuthGuard attached at controller class level', () => {
      const guards = Reflect.getMetadata('__guards__', SearchController);
      expect(guards).toBeDefined();
      expect(guards).toContain(ClerkAuthGuard);
    });

    it('enforces @Throttle rate limit metadata (60 req / 60s) to prevent vector DB compute exhaustion', () => {
      const throttlerLimit = Reflect.getMetadata('THROTTLER:LIMITdefault', controller.search);
      const throttlerTtl = Reflect.getMetadata('THROTTLER:TTLdefault', controller.search);

      expect(throttlerLimit).toBe(60);
      expect(throttlerTtl).toBe(60000);
    });
  });

  // ==========================================
  // Layer 4: Failure Modes & Regression Guards
  // ==========================================
  describe('Layer 4: Failure Modes & Error Propagation', () => {
    it('propagates service exceptions without swallowing error stack', async () => {
      const upstreamError = new Error('PostgreSQL pgvector query timeout');
      mockHybridSearchService.search.mockRejectedValueOnce(upstreamError);

      const dto: SearchQueryDto = { query: 'Failing search' };

      await expect(controller.search(mockTenant, dto)).rejects.toThrow(
        'PostgreSQL pgvector query timeout',
      );
    });

    it('ensures tenant context is never corrupted across requests', async () => {
      mockHybridSearchService.search.mockResolvedValueOnce(sampleSearchResponse);

      const tenantA: TenantContext = {
        organizationId: 'org-tenant-a',
        userId: 'user-a',
        userRole: UserRole.MEMBER,
        userEmail: 'user-a@company.com',
      };

      await controller.search(tenantA, { query: 'tenant isolation check' });
      expect(mockHybridSearchService.search).toHaveBeenCalledWith(tenantA, expect.anything());
    });
  });
});
