import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import {
  Department,
  DocumentCitation,
  SemanticCacheStats,
  TenantContext,
} from '@knowledge/shared';
import Redis from 'ioredis';

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
export class SemanticCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SemanticCacheService.name);

  // In-memory fallback / local fast-path store
  // Key format: `${organizationId}:${department}`
  private cacheStore = new Map<string, SemanticCacheEntry[]>();

  // Distributed Redis client (optional, auto-instantiated if REDIS_URL exists)
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  // Local metrics trackers (synced or fallback)
  private hitCounter = new Map<string, number>();
  private missCounter = new Map<string, number>();

  private readonly COSINE_SIMILARITY_THRESHOLD = 0.96;
  private readonly MAX_ENTRIES_PER_PARTITION = 250;
  private readonly REDIS_CACHE_TTL_SECONDS = 604800; // 7 days TTL

  constructor(@Optional() customRedis?: Redis) {
    if (customRedis) {
      this.redisClient = customRedis;
      this.isRedisConnected = true;
    }
  }

  onModuleInit(): void {
    if (!this.redisClient && process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
          lazyConnect: true,
        });

        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          this.logger.log('Connected to Distributed Redis Semantic Cache Cluster.');
        });

        this.redisClient.on('error', (err: Error) => {
          this.isRedisConnected = false;
          this.logger.warn(`Redis Semantic Cache disconnected (${err.message}). Using local in-memory fallback.`);
        });

        this.redisClient.connect().catch((err: Error) => {
          this.isRedisConnected = false;
          this.logger.warn(`Initial Redis connection skipped (${err.message}). Running in-memory mode.`);
        });
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(`Could not initialize Redis client (${error.message}). Running in-memory mode.`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        this.redisClient.disconnect();
      }
    }
  }

  /**
   * Looks up query in the semantic cache using Cosine Similarity on embedding vectors.
   * Enforces strict multi-tenant and department ACL isolation across Redis / memory.
   */
  async get(
    tenant: TenantContext,
    query: string,
    queryVector: number[],
  ): Promise<SemanticCacheMatch | null> {
    const orgId = tenant.organizationId;
    const dept = tenant.department || Department.ALL;
    const partitionKey = `${orgId}:${dept}`;

    if (!queryVector || queryVector.length === 0) {
      this.recordMiss(orgId);
      return null;
    }

    const entries = await this.loadPartitionEntries(partitionKey);

    // Also check company-wide partition (Department.ALL) if user has specific department
    if (dept !== Department.ALL) {
      const allEntries = await this.loadPartitionEntries(`${orgId}:${Department.ALL}`);
      entries.push(...allEntries);
    }

    if (entries.length === 0) {
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
   * Persists to distributed Redis cluster with TTL and in-memory partition.
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

    const newEntry: SemanticCacheEntry = {
      id: `cache-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      query: query.trim(),
      vector: queryVector,
      answer,
      citations,
      createdAt: Date.now(),
      department: dept,
    };

    // 1. Update in-memory store
    const existingEntries = this.cacheStore.get(partitionKey) || [];
    const updated = [newEntry, ...existingEntries].slice(0, this.MAX_ENTRIES_PER_PARTITION);
    this.cacheStore.set(partitionKey, updated);

    // 2. Persist to Redis if available
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = `semcache:${partitionKey}`;
        await this.redisClient.lpush(redisKey, JSON.stringify(newEntry));
        await this.redisClient.ltrim(redisKey, 0, this.MAX_ENTRIES_PER_PARTITION - 1);
        await this.redisClient.expire(redisKey, this.REDIS_CACHE_TTL_SECONDS);
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(`Redis cache set failed: ${error.message}. Local memory kept.`);
      }
    }

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

    // Invalidate in Redis if connected
    if (this.isRedisConnected && this.redisClient) {
      try {
        const pattern = department && department !== Department.ALL
          ? `semcache:${organizationId}:${department}`
          : `semcache:${organizationId}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(`Redis cache invalidation failed: ${error.message}`);
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

  private async loadPartitionEntries(partitionKey: string): Promise<SemanticCacheEntry[]> {
    // 1. Check Redis if active
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = `semcache:${partitionKey}`;
        const rawItems = await this.redisClient.lrange(redisKey, 0, -1);
        if (rawItems && rawItems.length > 0) {
          const parsed = rawItems
            .map((item) => {
              try {
                return JSON.parse(item) as SemanticCacheEntry;
              } catch {
                return null;
              }
            })
            .filter((e): e is SemanticCacheEntry => e !== null);

          // Update local memory cache with Redis contents for ultra-fast local hits
          this.cacheStore.set(partitionKey, parsed);
          return parsed;
        }
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(`Redis read failed: ${error.message}. Falling back to memory.`);
      }
    }

    // 2. Return from in-memory fallback
    return this.cacheStore.get(partitionKey) || [];
  }

  private recordHit(orgId: string): void {
    this.hitCounter.set(orgId, (this.hitCounter.get(orgId) || 0) + 1);
  }

  private recordMiss(orgId: string): void {
    this.missCounter.set(orgId, (this.missCounter.get(orgId) || 0) + 1);
  }
}
