import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionProcessor } from './ingestion.processor';
import { Department, IngestionStatus } from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from '../services/embedding.service';
import { DataSanitizerService } from '../services/data-sanitizer.service';

describe('IngestionProcessor (High-Throughput Bulk Chunk Ingestion)', () => {
  let processor: IngestionProcessor;
  let mockPrisma: any;
  let mockEmbeddingService: any;
  let mockSanitizer: any;

  beforeEach(() => {
    mockPrisma = {
      client: {
        document: {
          update: vi.fn().mockResolvedValue({ id: 'doc-10k-1' }),
        },
        documentChunk: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        $executeRawUnsafe: vi.fn().mockResolvedValue(1),
      },
    };

    mockEmbeddingService = {
      embedDocuments: vi.fn().mockImplementation(async (texts: string[]) => {
        return texts.map(() => new Array(768).fill(0.05));
      }),
    };

    mockSanitizer = {
      sanitizeText: vi.fn().mockImplementation((text: string) => text),
    };

    processor = new IngestionProcessor(
      mockPrisma as PrismaService,
      mockEmbeddingService as EmbeddingService,
      mockSanitizer as DataSanitizerService,
    );
  });

  it('should batch multiple chunks into single parameterized multi-row SQL insert statements', async () => {
    // Generate text that produces multiple chunks (> 1200 characters)
    const longContent = 'Enterprise knowledge document content for law firms and healthcare systems. '.repeat(40);

    await processor.processDocument({
      documentId: 'doc-10k-1',
      organizationId: 'org-enterprise-1',
      content: longContent,
      department: Department.ENGINEERING,
      metadata: {
        matterId: 'MATTER-2026-SCALE',
        clearanceLevel: 'CONFIDENTIAL',
      },
    });

    // 1. Status updated to PROCESSING then INDEXED
    expect(mockPrisma.client.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-10k-1' },
      data: { status: IngestionStatus.PROCESSING },
    });

    expect(mockPrisma.client.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-10k-1' },
      data: {
        status: IngestionStatus.INDEXED,
        errorMessage: null,
      },
    });

    // 2. Batched Embeddings invoked
    expect(mockEmbeddingService.embedDocuments).toHaveBeenCalled();

    // 3. Batch SQL insert invoked with multi-row VALUES clauses in a single call
    expect(mockPrisma.client.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    const callArgs = mockPrisma.client.$executeRawUnsafe.mock.calls[0];
    expect(callArgs[0]).toContain('INSERT INTO document_chunks');
    expect(callArgs[0]).toContain('VALUES');
    expect(callArgs[1]).toBe('doc-10k-1');
    expect(callArgs[2]).toBe('org-enterprise-1');
    expect(callArgs[5]).toBe(Department.ENGINEERING);
    expect(callArgs[7]).toContain('MATTER-2026-SCALE');
    expect(callArgs[7]).toContain('CONFIDENTIAL');
  });

  it('should mark document as FAILED if text extraction is empty', async () => {
    await expect(
      processor.processDocument({
        documentId: 'doc-empty',
        organizationId: 'org-enterprise-1',
        content: '   ',
      }),
    ).rejects.toThrow('Document content is empty or unparsable');

    expect(mockPrisma.client.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-empty' },
      data: {
        status: IngestionStatus.FAILED,
        errorMessage: 'Document content is empty or unparsable',
      },
    });
  });

  it('prepends contextual [documentTitle > sectionHeading] headers, stores sectionHeading metadata, and indexes dual simple/english tsvector', async () => {
    const markdown = [
      '# Security Controls',
      '## VPN Access',
      'All developers must connect via WireGuard using SSO certificates.',
    ].join('\n');

    await processor.processDocument({
      documentId: 'doc-md-1',
      organizationId: 'org-enterprise-1',
      documentTitle: 'IT Runbook',
      content: markdown,
      department: Department.ENGINEERING,
    });

    const callArgs = mockPrisma.client.$executeRawUnsafe.mock.calls[0];
    expect(callArgs[0]).toContain("to_tsvector('simple'");
    expect(callArgs[0]).toContain("to_tsvector('english'");
    // Chunk content carries contextual header
    expect(callArgs[4]).toContain('[IT Runbook > Security Controls > VPN Access]');
    // Chunk JSONB metadata records sectionHeading
    expect(callArgs[7]).toContain('"sectionHeading":"Security Controls > VPN Access"');
  });
});
