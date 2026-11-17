import { Injectable, Logger } from '@nestjs/common';
import { IngestionStatus } from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from '../services/embedding.service';
import { RecursiveTextChunker } from '../utils/text-chunker';

export interface IngestionJobData {
  documentId: string;
  organizationId: string;
  content: string;
}

@Injectable()
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);
  private readonly chunker = new RecursiveTextChunker(600, 100);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async processDocument(data: IngestionJobData): Promise<void> {
    const { documentId, organizationId, content } = data;
    this.logger.log(`Starting ingestion processing for document ${documentId} (Org: ${organizationId})`);

    try {
      // 1. Set status to PROCESSING
      await this.prisma.client.document.update({
        where: { id: documentId },
        data: { status: IngestionStatus.PROCESSING },
      });

      // 2. Chunk text
      const chunks = this.chunker.splitText(content);
      if (chunks.length === 0) {
        throw new Error('Document content is empty or unparsable');
      }

      // 3. Generate embeddings
      const chunkTexts = chunks.map((c) => c.content);
      const embeddings = await this.embeddingService.embedDocuments(chunkTexts);

      // 4. Clean up any existing chunks for idempotency
      await this.prisma.client.documentChunk.deleteMany({
        where: { documentId },
      });

      // 5. Store chunks with embeddings into database
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vectorStr = `[${embeddings[i].join(',')}]`;

        // Insert using SQL to cast vector string to pgvector vector(768) and tsvector
        await this.prisma.client.$executeRawUnsafe(
          `INSERT INTO document_chunks (id, "documentId", "organizationId", "chunkIndex", content, embedding, tsv, "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, to_tsvector('english', $4), NOW())`,
          documentId,
          organizationId,
          chunk.chunkIndex,
          chunk.content,
          vectorStr,
        );
      }

      // 6. Mark document as INDEXED
      await this.prisma.client.document.update({
        where: { id: documentId },
        data: {
          status: IngestionStatus.INDEXED,
          errorMessage: null,
        },
      });

      this.logger.log(`Document ${documentId} successfully indexed with ${chunks.length} chunks.`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Document ingestion failed for ${documentId}: ${error.message}`);
      await this.prisma.client.document.update({
        where: { id: documentId },
        data: {
          status: IngestionStatus.FAILED,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }
}
