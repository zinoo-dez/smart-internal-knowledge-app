import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  Department,
  DocumentCitation,
  DocumentSource,
  SearchQueryResponse,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../documents/services/embedding.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { RerankService } from './rerank.service';

interface RawSearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  source: string;
  source_url: string | null;
  snippet: string;
  relevance_score: number | string;
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    @Optional() private readonly rerankService?: RerankService,
  ) {}

  async search(
    tenant: TenantContext,
    dto: SearchQueryDto,
  ): Promise<SearchQueryResponse> {
    const topK = dto.topK || 5;
    const minScore = dto.minScore || 0.0;
    const candidateLimit = Math.max(topK * 3, 20);
    const userDept = tenant.department || Department.ALL;
    const isAdmin = tenant.userRole === UserRole.ADMIN;

    // 1. Generate query embedding vector
    const queryVector = await this.embeddingService.embedText(dto.query);
    const vectorString = `[${queryVector.join(',')}]`;

    try {
      // If rerank service is active, fetch candidate pool for 2nd stage scoring; otherwise topK
      const fetchLimit = this.rerankService ? candidateLimit : topK;

      // 2. Execute PostgreSQL Native Hybrid Search with Reciprocal Rank Fusion (RRF) & Department ACLs
      const rawResults = await this.prisma.client.$queryRawUnsafe<RawSearchResult[]>(
        `WITH vector_matches AS (
           SELECT 
             c.id AS chunk_id,
             c."documentId" AS document_id,
             d.title AS document_title,
             d.source::text AS source,
             d."sourceUrl" AS source_url,
             c.content AS snippet,
             ROW_NUMBER() OVER (ORDER BY c.embedding <=> $1::vector) AS vector_rank
           FROM document_chunks c
           JOIN documents d ON d.id = c."documentId"
           WHERE c."organizationId" = $2
             AND c.embedding IS NOT NULL
             AND (c.department = 'ALL' OR c.department::text = $6 OR $7 = true)
           ORDER BY c.embedding <=> $1::vector
           LIMIT $3
         ),
         keyword_matches AS (
           SELECT 
             c.id AS chunk_id,
             c."documentId" AS document_id,
             d.title AS document_title,
             d.source::text AS source,
             d."sourceUrl" AS source_url,
             c.content AS snippet,
             ROW_NUMBER() OVER (ORDER BY GREATEST(ts_rank_cd(c.tsv, plainto_tsquery('english', $4)), ts_rank_cd(c.tsv, plainto_tsquery('simple', $4))) DESC) AS keyword_rank
           FROM document_chunks c
           JOIN documents d ON d.id = c."documentId"
           WHERE c."organizationId" = $2
             AND (c.tsv @@ plainto_tsquery('english', $4) OR c.tsv @@ plainto_tsquery('simple', $4) OR c.content ILIKE '%' || $4 || '%')
             AND (c.department = 'ALL' OR c.department::text = $6 OR $7 = true)
           LIMIT $3
         )
         SELECT 
           COALESCE(v.chunk_id, k.chunk_id) AS chunk_id,
           COALESCE(v.document_id, k.document_id) AS document_id,
           COALESCE(v.document_title, k.document_title) AS document_title,
           COALESCE(v.source, k.source) AS source,
           COALESCE(v.source_url, k.source_url) AS source_url,
           COALESCE(v.snippet, k.snippet) AS snippet,
           (COALESCE(1.0 / (60.0 + v.vector_rank), 0.0) + COALESCE(1.0 / (60.0 + k.keyword_rank), 0.0)) AS relevance_score
         FROM vector_matches v
         FULL OUTER JOIN keyword_matches k ON v.chunk_id = k.chunk_id
         ORDER BY relevance_score DESC
         LIMIT $5`,
        vectorString,
        tenant.organizationId,
        candidateLimit,
        dto.query,
        fetchLimit,
        userDept,
        isAdmin,
      );

      let citations: DocumentCitation[] = (rawResults || [])
        .map((row) => ({
          chunkId: row.chunk_id,
          documentId: row.document_id,
          documentTitle: row.document_title,
          source: (row.source as DocumentSource) || DocumentSource.FILE_UPLOAD,
          sourceUrl: row.source_url ?? undefined,
          snippet: row.snippet,
          relevanceScore: Number(row.relevance_score),
        }))
        .filter((c) => c.relevanceScore >= minScore);

      // Stage 2: 2nd-Stage Cross-Encoder Re-Ranking
      if (this.rerankService && citations.length > 0) {
        citations = await this.rerankService.rerank(dto.query, citations, topK);
      }

      return { citations };
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.warn(`Native Postgres hybrid query fallback: ${error.message}`);
      
      try {
        const fallbackChunks = await this.prisma.client.documentChunk.findMany({
          where: {
            organizationId: tenant.organizationId,
            content: { contains: dto.query, mode: 'insensitive' },
            OR: [
              { department: 'ALL' as any },
              { department: userDept as any },
            ],
          },
          include: { document: true },
          take: topK,
        });

        const citations: DocumentCitation[] = fallbackChunks.map((c) => ({
          chunkId: c.id,
          documentId: c.documentId,
          documentTitle: c.document.title,
          source: c.document.source as unknown as DocumentSource,
          sourceUrl: c.document.sourceUrl ?? undefined,
          snippet: c.content,
          relevanceScore: 0.85,
        }));

        return { citations };
      } catch (fallbackErr) {
        this.logger.debug(`Prisma fallbackChunks offline: ${(fallbackErr as Error).message}`);
        return { citations: [] };
      }
    }
  }
}
