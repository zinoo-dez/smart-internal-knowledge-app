import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
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
import { extractTextFromPdf } from './utils/pdf-parser';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestionProcessor: IngestionProcessor,
  ) {}

  async createDocumentFromFile(
    tenant: TenantContext,
    file: Express.Multer.File,
    title?: string,
    department: Department = Department.ALL,
  ): Promise<IngestDocumentResponse> {
    const docTitle = title || file.originalname || 'Uploaded Document';
    let content = '';

    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
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

    // Execute ingestion asynchronously in background without blocking response
    setImmediate(async () => {
      try {
        await this.ingestionProcessor.processDocument({
          documentId: document.id,
          organizationId: tenant.organizationId,
          content: dto.content,
          department: dept,
        });
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.error(`Background ingestion job ${jobId} failed: ${error.message}`);
      }
    });

    return {
      documentId: document.id,
      status: IngestionStatus.PENDING,
      jobId,
      message: 'Document accepted for ingestion and queued for embedding generation',
    };
  }

  async listDocuments(tenant: TenantContext): Promise<DocumentSummary[]> {
    const docs = await this.prisma.client.document.findMany({
      where: { organizationId: tenant.organizationId },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => ({
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
    }));
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
    return { success: true };
  }
}
