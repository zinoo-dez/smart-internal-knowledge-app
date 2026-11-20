import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AuditAction,
  Department,
  DocumentSource,
  DocumentSummary,
  IngestDocumentResponse,
  IngestionStatus,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { IngestionProcessor } from './workers/ingestion.processor';
import { IngestionQueueService } from './workers/ingestion-queue.service';
import { extractTextFromPdf } from './utils/pdf-parser';
import { DataSanitizerService } from './services/data-sanitizer.service';
import { AuditLogService } from '../audit/audit-log.service';
import { SemanticCacheService } from '../search/semantic-cache.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestionProcessor: IngestionProcessor,
    private readonly dataSanitizer: DataSanitizerService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional() private readonly semanticCacheService?: SemanticCacheService,
    @Optional() private readonly ingestionQueueService?: IngestionQueueService,
  ) {}

  async createDocumentFromFile(
    tenant: TenantContext,
    file: Express.Multer.File,
    title?: string,
    department: Department = Department.ALL,
  ): Promise<IngestDocumentResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit
    if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 15MB.`,
      );
    }

    const filename = (file.originalname || '').toLowerCase();

    // Strict allowlist of safe enterprise knowledge document formats
    const allowedExtensions = ['.pdf', '.md', '.markdown', '.txt', '.csv', '.json', '.docx'];
    const hasAllowedExt = allowedExtensions.some((ext) => filename.endsWith(ext));
    if (!hasAllowedExt) {
      throw new BadRequestException(
        `Unsupported or dangerous file type "${file.originalname}". Allowed formats: PDF, Markdown, TXT, CSV, JSON, DOCX.`,
      );
    }

    const docTitle = title || file.originalname || 'Uploaded Document';
    let content: string;

    if (file.mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      // Verify PDF magic header (%PDF-) when real binary payload is provided
      const header = file.buffer?.subarray(0, 5).toString('ascii') || '';
      if (file.buffer && file.buffer.length >= 5 && !header.startsWith('%PDF-') && process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Invalid PDF file signature (magic-byte verification failed).');
      }
      content = await extractTextFromPdf(file.buffer);
    } else {
      content = file.buffer.toString('utf-8');
    }

    return this.createDocument(tenant, {
      title: docTitle,
      source: DocumentSource.FILE_UPLOAD,
      department,
      content,
      mimeType: file.mimetype,
    });
  }

  async createDocument(
    tenant: TenantContext,
    dto: CreateDocumentDto,
  ): Promise<IngestDocumentResponse> {
    const dept = dto.department || Department.ALL;
    const document = await this.prisma.client.document.create({
      data: {
        organizationId: tenant.organizationId,
        title: dto.title,
        source: dto.source,
        department: dept as any,
        sourceUrl: dto.sourceUrl,
        mimeType: dto.mimeType || 'text/plain',
        status: IngestionStatus.PENDING,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
    });

    const jobId = `job-${document.id}`;
    const sanitizedContent = this.dataSanitizer.sanitizeText(dto.content);

    if (this.auditLogService) {
      await this.auditLogService.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.DOCUMENT_INGESTED,
        resource: `Document:${document.id}`,
        details: {
          title: dto.title,
          source: dto.source,
          department: dept,
        },
      });
    }

    if (this.semanticCacheService) {
      await this.semanticCacheService.invalidate(tenant.organizationId, dept);
    }

    // Enqueue ingestion via Hybrid BullMQ (falls back cleanly to inline background job)
    const ingestionPayload = {
      documentId: document.id,
      organizationId: tenant.organizationId,
      documentTitle: dto.title,
      content: sanitizedContent,
      department: dept,
    };

    let resolvedJobId = jobId;
    if (this.ingestionQueueService) {
      const queued = await this.ingestionQueueService.enqueueDocument(ingestionPayload);
      resolvedJobId = queued.jobId;
    } else {
      setImmediate(async () => {
        try {
          await this.ingestionProcessor.processDocument(ingestionPayload);
        } catch (err: unknown) {
          const error = err as Error;
          this.logger.error(`Background ingestion job ${jobId} failed: ${error.message}`);
        }
      });
    }

    return {
      documentId: document.id,
      status: IngestionStatus.PENDING,
      jobId: resolvedJobId,
      message: 'Document accepted for ingestion and queued for embedding generation',
    };
  }

  async listDocuments(tenant: TenantContext): Promise<DocumentSummary[]> {
    const isAdmin = tenant.userRole === UserRole.ADMIN;
    const userDept = tenant.department || Department.ALL;

    const docs = await this.prisma.client.document.findMany({
      where: {
        organizationId: tenant.organizationId,
        // Enforce Department ACL on document listing for non-admin members
        ...(isAdmin
          ? {}
          : {
              OR: [{ department: Department.ALL as any }, { department: userDept as any }],
            }),
      },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => {
      const isStale = Date.now() - doc.updatedAt.getTime() > 180 * 24 * 60 * 60 * 1000;
      const meta = doc.metadata as Record<string, unknown> | null;
      return {
        id: doc.id,
        organizationId: doc.organizationId,
        title: doc.title,
        source: doc.source as unknown as DocumentSource,
        department: doc.department as unknown as Department,
        sourceUrl: doc.sourceUrl ?? undefined,
        status: doc.status as unknown as IngestionStatus,
        chunkCount: doc._count.chunks,
        isStale,
        lastSyncAt: meta?.lastSync ? String(meta.lastSync) : undefined,
        errorMessage: doc.errorMessage ?? undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    });
  }

  async getDocument(tenant: TenantContext, id: string): Promise<DocumentSummary> {
    const doc = await this.prisma.client.document.findUnique({
      where: { id },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Strict IDOR protection: User cannot access documents outside their tenant organization
    if (doc.organizationId !== tenant.organizationId) {
      throw new ForbiddenException('Access denied to documents outside your organization');
    }

    // Department ACL enforcement: non-admin users cannot access restricted department documents
    const docDept = (doc.department as unknown as Department) || Department.ALL;
    const userDept = tenant.department || Department.ALL;
    if (
      tenant.userRole !== UserRole.ADMIN &&
      docDept !== Department.ALL &&
      docDept !== userDept
    ) {
      throw new ForbiddenException('Access denied: document restricted to another department');
    }

    return {
      id: doc.id,
      organizationId: doc.organizationId,
      title: doc.title,
      source: doc.source as unknown as DocumentSource,
      department: doc.department as unknown as Department,
      sourceUrl: doc.sourceUrl ?? undefined,
      status: doc.status as unknown as IngestionStatus,
      chunkCount: doc._count.chunks,
      errorMessage: doc.errorMessage ?? undefined,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async deleteDocument(tenant: TenantContext, id: string): Promise<{ success: boolean }> {
    const doc = await this.prisma.client.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (doc.organizationId !== tenant.organizationId) {
      throw new ForbiddenException('Cannot delete documents outside your organization');
    }

    // Only Admin can delete documents
    if (tenant.userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Administrators can delete company documents');
    }

    await this.prisma.client.document.delete({ where: { id } });

    if (this.auditLogService) {
      await this.auditLogService.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.DOCUMENT_DELETED,
        resource: `Document:${id}`,
        details: {
          title: doc.title,
        },
      });
    }

    if (this.semanticCacheService) {
      await this.semanticCacheService.invalidate(
        tenant.organizationId,
        doc.department as unknown as Department,
      );
    }

    return { success: true };
  }
}
