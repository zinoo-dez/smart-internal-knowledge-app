import { Injectable, Logger } from '@nestjs/common';
import {
  Department,
  DocumentCitation,
  SemanticCacheStats,
  TenantContext,
} from '@knowledge/shared';

export interface SemanticCacheEntry {
  id: string;
  query: string;
  vector: number[];
  answer: string;
  citations: DocumentCitation[];
  createdAt: number;
  department: Department;
}

export interface SemanticCacheMatch {
  answer: string;
  citations: DocumentCitation[];
  similarity: number;
  cachedQuery: string;
}

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);

  // In-memory / Redis-backed high-speed vector cache store
  // Key format: `${organizationId}:${department}`
  private cacheStore = new Map<string, SemanticCacheEntry[]>();

  // Metrics trackers
  private hitCounter = new Map<string, number>();
  private missCounter = new Map<string, number>();

  private readonly COSINE_SIMILARITY_THRESHOLD = 0.96;
  private readonly MAX_ENTRIES_PER_PARTITION = 250;

  /**
   * Looks up query in the semantic cache using Cosine Similarity on embedding vectors.
   * Enforces strict multi-tenant and department ACL isolation.
   */
  async get(
    tenant: TenantContext,
    query: string,
    queryVector: number[],
  ): Promise<SemanticCacheMatch | null> {
    const orgId = tenant.organizationId;
    const dept = tenant.department || Department.ALL;
    const partitionKey = `${orgId}:${dept}`;

    const entries = this.cacheStore.get(partitionKey) || [];
    if (entries.length === 0 || !queryVector || queryVector.length === 0) {
      this.recordMiss(orgId);
      return null;
    }

    let bestMatch: SemanticCacheEntry | null = null;
    let highestSim = -1.0;

    for (const entry of entries) {
      const sim = this.computeCosineSimilarity(queryVector, entry.vector);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = entry;
      }
    }

    if (bestMatch && highestSim >= this.COSINE_SIMILARITY_THRESHOLD) {
      this.recordHit(orgId);
      this.logger.log(
        `Semantic Cache HIT! Similarity: ${highestSim.toFixed(4)} for query: "${query}" (Cached: "${bestMatch.query}")`,
      );
      return {
        answer: bestMatch.answer,
        citations: bestMatch.citations,
        similarity: Number(highestSim.toFixed(4)),
        cachedQuery: bestMatch.query,
      };
    }

    this.recordMiss(orgId);
    return null;
  }

  /**
   * Stores a generated answer and citations in the semantic cache.
   */
  async set(
    tenant: TenantContext,
    query: string,
    queryVector: number[],
    answer: string,
    citations: DocumentCitation[],
  ): Promise<void> {
    if (!queryVector || queryVector.length === 0 || !answer) {
      return;
    }

    const orgId = tenant.organizationId;
    const dept = tenant.department || Department.ALL;
    const partitionKey = `${orgId}:${dept}`;

    const existingEntries = this.cacheStore.get(partitionKey) || [];

    const newEntry: SemanticCacheEntry = {
      id: `cache-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      query: query.trim(),
      vector: queryVector,
      answer,
      citations,
      createdAt: Date.now(),
      department: dept,
    };

    // Evict oldest entries if limit reached (LRU semantics)
    const updated = [newEntry, ...existingEntries].slice(0, this.MAX_ENTRIES_PER_PARTITION);
    this.cacheStore.set(partitionKey, updated);

    this.logger.log(
      `Cached answer in Semantic Cache for query: "${query}" (Partition: ${partitionKey}, Total: ${updated.length})`,
    );
  }

  /**
   * Invalidates cached entries when documents are ingested, updated, or deleted.
   */
  async invalidate(organizationId: string, department?: Department): Promise<number> {
    let evictedCount = 0;
    for (const [key, entries] of this.cacheStore.entries()) {
      const [entryOrgId, entryDept] = key.split(':');
      if (entryOrgId === organizationId) {
        if (!department || department === Department.ALL || entryDept === department) {
          evictedCount += entries.length;
          this.cacheStore.delete(key);
        }
      }
    }

    this.logger.log(
      `Invalidated Semantic Cache for org: ${organizationId} (Evicted ${evictedCount} entries)`,
    );
    return evictedCount;
  }

  /**
   * Returns live semantic cache efficiency metrics.
   */
  getStats(organizationId: string): SemanticCacheStats {
    const hits = this.hitCounter.get(organizationId) || 0;
    const misses = this.missCounter.get(organizationId) || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0;

    let cachedQueriesCount = 0;
    for (const [key, entries] of this.cacheStore.entries()) {
      if (key.startsWith(`${organizationId}:`)) {
        cachedQueriesCount += entries.length;
      }
    }

    // Estimated $0.002 savings per cached question (LLM token generation avoided)
    const estimatedCostSavingsUsd = Number((hits * 0.002).toFixed(3));

    return {
      hits,
      misses,
      hitRate,
      cachedQueriesCount,
      estimatedCostSavingsUsd,
    };
  }

  /**
   * High-performance Cosine Similarity calculation between two dense vectors.
   */
  computeCosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) {
      return 0.0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0.0 || normB === 0.0) {
      return 0.0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private recordHit(orgId: string): void {
    this.hitCounter.set(orgId, (this.hitCounter.get(orgId) || 0) + 1);
  }

  private recordMiss(orgId: string): void {
    this.missCounter.set(orgId, (this.missCounter.get(orgId) || 0) + 1);
  }
}
