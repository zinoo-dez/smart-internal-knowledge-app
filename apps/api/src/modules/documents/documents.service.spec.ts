import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Department, DocumentSource, IngestionStatus, TenantContext, UserRole } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionProcessor } from './workers/ingestion.processor';
import { DataSanitizerService } from './services/data-sanitizer.service';
import { BillingService } from '../billing/billing.service';

describe('DocumentsService (CRUD & IDOR Security Audit)', () => {
  let service: DocumentsService;
  let mockPrisma: any;
  let mockProcessor: any;
  let dataSanitizer: DataSanitizerService;

  const tenantA: TenantContext = {
    organizationId: 'org-alpha',
    userId: 'user-alice',
    userRole: UserRole.MEMBER,
    userEmail: 'alice@alpha.com',
  };

  const adminA: TenantContext = {
    organizationId: 'org-alpha',
    userId: 'user-admin',
    userRole: UserRole.ADMIN,
    userEmail: 'admin@alpha.com',
  };

  const tenantB: TenantContext = {
    organizationId: 'org-beta',
    userId: 'user-bob',
    userRole: UserRole.MEMBER,
    userEmail: 'bob@beta.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        document: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          delete: vi.fn(),
        },
      },
    };
    mockProcessor = {
      processDocument: vi.fn().mockResolvedValue(undefined),
    };
    dataSanitizer = new DataSanitizerService();

    service = new DocumentsService(
      mockPrisma as PrismaService,
      mockProcessor as IngestionProcessor,
      dataSanitizer,
    );
  });

  it('should create document and queue background ingestion', async () => {
    mockPrisma.client.document.create.mockResolvedValue({
      id: 'doc-100',
      organizationId: 'org-alpha',
      title: 'Engineering Onboarding',
      source: DocumentSource.FILE_UPLOAD,
      status: IngestionStatus.PENDING,
    });

    const result = await service.createDocument(tenantA, {
      title: 'Engineering Onboarding',
      source: DocumentSource.FILE_UPLOAD,
      content: 'Steps to setup your development workstation...',
    });

    expect(result.documentId).toBe('doc-100');
    expect(result.status).toBe(IngestionStatus.PENDING);
    expect(mockPrisma.client.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-alpha',
        title: 'Engineering Onboarding',
      }),
    });
  });

  it('should parse binary file and ingest document with createDocumentFromFile', async () => {
    mockPrisma.client.document.create.mockResolvedValue({
      id: 'doc-pdf-1',
      organizationId: 'org-alpha',
      title: 'Company_Policy.pdf',
      source: DocumentSource.FILE_UPLOAD,
      status: IngestionStatus.PENDING,
    });

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'Company_Policy.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.4 Mock PDF content with company policy rules'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const result = await service.createDocumentFromFile(tenantA, mockFile);
    expect(result.documentId).toBe('doc-pdf-1');
    expect(mockPrisma.client.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Company_Policy.pdf',
        mimeType: 'application/pdf',
      }),
    });
  });

  it('should BLOCK IDOR when user from Org B attempts to read document belonging to Org A', async () => {
    mockPrisma.client.document.findUnique.mockResolvedValue({
      id: 'doc-alpha-secret',
      organizationId: 'org-alpha', // Belongs to Org Alpha
      title: 'Alpha Secret Roadmap',
      source: DocumentSource.FILE_UPLOAD,
      status: IngestionStatus.INDEXED,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { chunks: 5 },
    });

    // Bob from Org Beta tries to access Alpha's document
    await expect(service.getDocument(tenantB, 'doc-alpha-secret')).rejects.toThrow(ForbiddenException);
  });

  it('should BLOCK document deletion if user does not have ADMIN role', async () => {
    mockPrisma.client.document.findUnique.mockResolvedValue({
      id: 'doc-alpha-1',
      organizationId: 'org-alpha',
    });

    // Alice is MEMBER, not ADMIN
    await expect(service.deleteDocument(tenantA, 'doc-alpha-1')).rejects.toThrow(ForbiddenException);
  });

  it('should ALLOW document deletion if user is ADMIN of the owning organization', async () => {
    mockPrisma.client.document.findUnique.mockResolvedValue({
      id: 'doc-alpha-1',
      organizationId: 'org-alpha',
    });
    mockPrisma.client.document.delete.mockResolvedValue({ id: 'doc-alpha-1' });

    const result = await service.deleteDocument(adminA, 'doc-alpha-1');
    expect(result.success).toBe(true);
    expect(mockPrisma.client.document.delete).toHaveBeenCalledWith({
      where: { id: 'doc-alpha-1' },
    });
  });

  it('should throw NotFoundException if document does not exist', async () => {
    mockPrisma.client.document.findUnique.mockResolvedValue(null);
    await expect(service.getDocument(tenantA, 'non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should redact AWS keys and PII before queuing background ingestion (Pre-Ingest Guardrail)', async () => {
    mockPrisma.client.document.create.mockResolvedValue({
      id: 'doc-sensitive-101',
      organizationId: 'org-alpha',
      title: 'Cloud Credentials Runbook',
      source: DocumentSource.FILE_UPLOAD,
      status: IngestionStatus.PENDING,
    });

    await service.createDocument(tenantA, {
      title: 'Cloud Credentials Runbook',
      source: DocumentSource.FILE_UPLOAD,
      content: 'Config: AWS_KEY=AKIAIOSFODNN7EXAMPLE and SSN=123-45-6789',
    });

    // Wait a tick for setImmediate background queue
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockProcessor.processDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-sensitive-101',
        content: 'Config: AWS_KEY=[REDACTED_AWS_KEY] and SSN=[REDACTED_SSN]',
      }),
    );
  });

  it('should allow non-admin department member to upload file scoped to their own department', async () => {
    const hrMember: TenantContext = {
      organizationId: 'org-alpha',
      userId: 'user-hr-1',
      userRole: UserRole.MEMBER,
      userEmail: 'hr@alpha.com',
      department: Department.HR,
    };

    mockPrisma.client.document.create.mockResolvedValue({
      id: 'doc-hr-1',
      organizationId: 'org-alpha',
      title: 'leave-policy.md',
      source: DocumentSource.FILE_UPLOAD,
      department: Department.HR,
      status: IngestionStatus.PENDING,
    });

    const mdFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'leave-policy.md',
      encoding: '7bit',
      mimetype: 'text/markdown',
      size: 256,
      buffer: Buffer.from('# Annual Leave\nEmployees receive 15 paid days.'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const result = await service.createDocumentFromFile(hrMember, mdFile);
    expect(result.documentId).toBe('doc-hr-1');
    expect(mockPrisma.client.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        department: Department.HR,
      }),
    });
  });

  it('should reject unsupported binary .docx uploads to prevent ZIP garbage ingestion', async () => {
    const docxFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'handbook.docx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 512,
      buffer: Buffer.from('PK\x03\x04binary-zip-payload'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    await expect(service.createDocumentFromFile(adminA, docxFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should enforce BillingService document quota and block ingestion when limit is reached', async () => {
    const mockBilling = {
      checkDocumentQuota: vi.fn().mockResolvedValue({
        allowed: false,
        reason: 'Document storage quota exceeded for FREE tier (10/10 documents).',
      }),
    };

    const quotaService = new DocumentsService(
      mockPrisma as PrismaService,
      mockProcessor as IngestionProcessor,
      dataSanitizer,
      undefined,
      undefined,
      undefined,
      mockBilling as unknown as BillingService,
    );

    await expect(
      quotaService.createDocument(adminA, {
        title: 'Overflow Doc',
        source: DocumentSource.FILE_UPLOAD,
        content: 'Blocked content',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.client.document.create).not.toHaveBeenCalled();
  });
});
