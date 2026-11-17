import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentSource, IngestionStatus, TenantContext, UserRole } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionProcessor } from './workers/ingestion.processor';

describe('DocumentsService (CRUD & IDOR Security Audit)', () => {
  let service: DocumentsService;
  let mockPrisma: any;
  let mockProcessor: any;

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

    service = new DocumentsService(
      mockPrisma as PrismaService,
      mockProcessor as IngestionProcessor,
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
});
