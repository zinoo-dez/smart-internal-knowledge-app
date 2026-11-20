import { beforeEach, describe, expect, it } from 'vitest';
import { ClearanceLevel, Department, DocumentSource, TenantContext, UserRole } from '@knowledge/shared';
import { SemanticCacheService } from './semantic-cache.service';

describe('SemanticCacheService (Zero-Latency Redis Semantic Vector Cache)', () => {
  let cacheService: SemanticCacheService;

  const tenantEngineering: TenantContext = {
    organizationId: 'org-test-cache',
    userId: 'user-eng-1',
    userRole: UserRole.MEMBER,
    userEmail: 'eng@company.com',
    department: Department.ENGINEERING,
  };

  const tenantHR: TenantContext = {
    organizationId: 'org-test-cache',
    userId: 'user-hr-1',
    userRole: UserRole.MEMBER,
    userEmail: 'hr@company.com',
    department: Department.HR,
  };

  beforeEach(() => {
    cacheService = new SemanticCacheService();
  });

  describe('Vector Cosine Similarity Computation', () => {
    it('should compute exact 1.0 for identical vectors', () => {
      const v1 = [0.2, 0.4, 0.6, 0.8];
      const v2 = [0.2, 0.4, 0.6, 0.8];

      const sim = cacheService.computeCosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(1.0, 5);
    });

    it('should compute 0.0 for orthogonal vectors', () => {
      const v1 = [1.0, 0.0];
      const v2 = [0.0, 1.0];

      const sim = cacheService.computeCosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(0.0, 5);
    });
  });

  describe('Semantic Cache Lookup & Hit/Miss Threshold (> 0.96)', () => {
    const baseVector = new Array(768).fill(0.1);
    const mockCitations = [
      {
        chunkId: 'chunk-wifi',
        documentId: 'doc-office',
        documentTitle: 'Office Wi-Fi & Network Guide',
        source: DocumentSource.FILE_UPLOAD,
        snippet: 'The office Wi-Fi password for guests is WelcomeToOffice2026.',
        relevanceScore: 0.98,
      },
    ];

    it('should return cache hit when query vector similarity >= 0.96', async () => {
      await cacheService.set(
        tenantEngineering,
        'what is the office wifi password?',
        baseVector,
        'The office Wi-Fi password is WelcomeToOffice2026 [1].',
        mockCitations,
      );

      // Slightly perturbed vector with similarity > 0.99
      const queryVectorNear = baseVector.map((val, idx) => (idx === 0 ? val + 0.001 : val));

      const match = await cacheService.get(
        tenantEngineering,
        'guest wifi credentials?',
        queryVectorNear,
      );

      expect(match).not.toBeNull();
      expect(match!.answer).toContain('WelcomeToOffice2026');
      expect(match!.similarity).toBeGreaterThanOrEqual(0.96);
      expect(match!.citations).toHaveLength(1);
    });

    it('should return cache miss when query vector similarity < 0.96', async () => {
      await cacheService.set(
        tenantEngineering,
        'what is the office wifi password?',
        baseVector,
        'The office Wi-Fi password is WelcomeToOffice2026 [1].',
        mockCitations,
      );

      // Distant vector with different direction
      const distantVector = baseVector.map((val, idx) => (idx % 2 === 0 ? -val : val));

      const match = await cacheService.get(
        tenantEngineering,
        'how do I file expense reports?',
        distantVector,
      );

      expect(match).toBeNull();
    });
  });

  describe('Multi-Tenant & Department ACL Boundaries', () => {
    it('should isolate cached answers by department preventing cross-department leaks', async () => {
      const engVector = new Array(768).fill(0.2);

      await cacheService.set(
        tenantEngineering,
        'AWS Production deployment keys',
        engVector,
        'Engineering confidential AWS access guidelines...',
        [],
      );

      // HR employee asking identical query should get cache miss due to department ACL partition
      const hrMatch = await cacheService.get(
        tenantHR,
        'AWS Production deployment keys',
        engVector,
      );

      expect(hrMatch).toBeNull();
    });

    it('should isolate cached answers by clearanceLevel and bypass cache when matter ethical walls apply', async () => {
      const vec = new Array(768).fill(0.3);
      const restrictedAdmin: TenantContext = {
        organizationId: 'org-test-cache',
        userId: 'user-exec-1',
        userRole: UserRole.ADMIN,
        userEmail: 'exec@company.com',
        department: Department.ENGINEERING,
        clearanceLevel: ClearanceLevel.RESTRICTED,
      };
      const internalMember: TenantContext = {
        organizationId: 'org-test-cache',
        userId: 'user-junior-1',
        userRole: UserRole.MEMBER,
        userEmail: 'junior@company.com',
        department: Department.ENGINEERING,
        clearanceLevel: ClearanceLevel.INTERNAL,
      };
      const walledUser: TenantContext = {
        ...restrictedAdmin,
        userId: 'user-walled',
        deniedMatterIds: ['MATTER-999'],
      };

      await cacheService.set(
        restrictedAdmin,
        'M&A acquisition valuation',
        vec,
        'Restricted valuation details [1]',
        [],
      );

      // Lower clearance member in same department MUST NOT hit RESTRICTED cache
      expect(await cacheService.get(internalMember, 'M&A acquisition valuation', vec)).toBeNull();

      // User with matter-level ethical walls MUST bypass shared cache
      expect(await cacheService.get(walledUser, 'M&A acquisition valuation', vec)).toBeNull();
    });
  });

  describe('Automated Invalidation & Metrics Tracking', () => {
    it('should invalidate cache on document update and update efficiency stats', async () => {
      const v = new Array(768).fill(0.05);

      await cacheService.set(tenantEngineering, 'VPN policy', v, 'WireGuard setup [1]', []);
      await cacheService.set(tenantEngineering, 'Holiday list', v, 'Company holidays [1]', []);

      let stats = cacheService.getStats(tenantEngineering.organizationId);
      expect(stats.cachedQueriesCount).toBe(2);

      // Invalidate engineering cache
      const evicted = await cacheService.invalidate(
        tenantEngineering.organizationId,
        Department.ENGINEERING,
      );
      expect(evicted).toBe(2);

      stats = cacheService.getStats(tenantEngineering.organizationId);
      expect(stats.cachedQueriesCount).toBe(0);
    });

    it('should calculate hit rate and estimated cost savings in USD', async () => {
      const v = new Array(768).fill(0.1);
      await cacheService.set(tenantEngineering, 'wifi password', v, 'Password123', []);

      // 1 Hit
      await cacheService.get(tenantEngineering, 'wifi password', v);
      // 1 Miss
      await cacheService.get(tenantEngineering, 'unrelated query', new Array(768).fill(-0.5));

      const stats = cacheService.getStats(tenantEngineering.organizationId);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50.0);
      expect(stats.estimatedCostSavingsUsd).toBe(0.002);
    });
  });
});
