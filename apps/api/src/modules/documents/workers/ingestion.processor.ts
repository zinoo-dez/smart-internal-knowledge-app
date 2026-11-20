import { Injectable, Logger } from '@nestjs/common';
import { Department, IngestionStatus } from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from '../services/embedding.service';
import { RecursiveTextChunker } from '../utils/text-chunker';
import { DataSanitizerService } from '../services/data-sanitizer.service';

export interface IngestionJobData {
  documentId: string;
  organizationId: string;
  content: string;
  department?: Department;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);
  private readonly chunker = new RecursiveTextChunker(600, 100);
  private readonly DB_BATCH_SIZE = 50;
  private readonly EMBED_BATCH_SIZE = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly dataSanitizer: DataSanitizerService,
  ) {}

  async processDocument(data: IngestionJobData): Promise<void> {
    const {
      documentId,
      organizationId,
      content,
      department = Department.ALL,
      metadata = {},
    } = data;
    const startTime = Date.now();
    this.logger.log(
      `Starting high-throughput ingestion for doc ${documentId} (Org: ${organizationId}, Dept: ${department})`,
    );

    try {
      // 1. Set status to PROCESSING
      await this.prisma.client.document.update({
        where: { id: documentId },
        data: { status: IngestionStatus.PROCESSING },
      });

      // 2. Sanitize any PII, credentials, or private keys prior to chunking & embedding
      const sanitizedContent = this.dataSanitizer.sanitizeText(content);

      // 3. Chunk sanitized text
      const chunks = this.chunker.splitText(sanitizedContent);
      if (chunks.length === 0) {
        throw new Error('Document content is empty or unparsable');
      }

      // 4. Batched Embedding Generation (outside DB transaction to avoid holding locks during network I/O)
      const chunkTexts = chunks.map((c) => c.content);
      const embeddings: number[][] = [];
      for (let i = 0; i < chunkTexts.length; i += this.EMBED_BATCH_SIZE) {
        const textSlice = chunkTexts.slice(i, i + this.EMBED_BATCH_SIZE);
        const sliceEmbeddings = await this.embeddingService.embedDocuments(textSlice);
        embeddings.push(...sliceEmbeddings);
      }

      // 5-7. Atomic Transaction: Delete old chunks + Batch Multi-Row Insert + Mark INDEXED
      const persistChunksAtomically = async (tx: any) => {
        await tx.documentChunk.deleteMany({
          where: { documentId },
        });

        for (let i = 0; i < chunks.length; i += this.DB_BATCH_SIZE) {
          const batchChunks = chunks.slice(i, i + this.DB_BATCH_SIZE);
          const batchEmbeddings = embeddings.slice(i, i + this.DB_BATCH_SIZE);

          const valueClauses: string[] = [];
          const params: unknown[] = [];
          let paramIdx = 1;

          for (let j = 0; j < batchChunks.length; j++) {
            const chunk = batchChunks[j];
            const vectorStr = `[${batchEmbeddings[j].join(',')}]`;
            const chunkMeta = JSON.stringify({
              ...metadata,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunks.length,
            });

            valueClauses.push(
              `(gen_random_uuid(), $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}::"Department", $${paramIdx + 5}::vector, to_tsvector('english', $${paramIdx + 3}), $${paramIdx + 6}::jsonb, NOW())`,
            );

            params.push(
              documentId,
              organizationId,
              chunk.chunkIndex,
              chunk.content,
              department,
              vectorStr,
              chunkMeta,
            );

            paramIdx += 7;
          }

          const batchSql = `
            INSERT INTO document_chunks (
              id, "documentId", "organizationId", "chunkIndex", content, department, embedding, tsv, metadata, "createdAt"
            )
            VALUES ${valueClauses.join(',\n')}
          `;

          await tx.$executeRawUnsafe(batchSql, ...params);
        }

        await tx.document.update({
          where: { id: documentId },
          data: {
            status: IngestionStatus.INDEXED,
            errorMessage: null,
          },
        });
      };

      if (typeof (this.prisma.client as any).$transaction === 'function') {
        await (this.prisma.client as any).$transaction(persistChunksAtomically, {
          timeout: 30000,
        });
      } else {
        await persistChunksAtomically(this.prisma.client);
      }

      const elapsedMs = Math.max(1, Date.now() - startTime);
      const chunksPerSec = ((chunks.length / elapsedMs) * 1000).toFixed(1);
      this.logger.log(
        `Document ${documentId} indexed: ${chunks.length} chunks in ${elapsedMs}ms (${chunksPerSec} chunks/sec).`,
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Document ingestion failed for ${documentId}: ${error.message}`);
      try {
        await this.prisma.client.document.update({
          where: { id: documentId },
          data: {
            status: IngestionStatus.FAILED,
            errorMessage: error.message,
          },
        });
      } catch (updateErr: unknown) {
        this.logger.error(
          `Failed to mark document ${documentId} as FAILED: ${(updateErr as Error).message}`,
        );
      }
      throw error;
    }
  }
}
