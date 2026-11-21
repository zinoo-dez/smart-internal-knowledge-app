import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditAction, TenantContext, UserRole } from '@knowledge/shared';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockPrisma: any;

  const tenant: TenantContext = {
    organizationId: 'org-tenant-123',
    userId: 'user-admin-456',
    userRole: UserRole.ADMIN,
    userEmail: 'security@company.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        auditLog: {
          create: vi.fn(),
          count: vi.fn(),
          findMany: vi.fn(),
        },
      },
    };

    service = new AuditLogService(mockPrisma as unknown as PrismaService);
  });

  describe('recordEvent', () => {
    it('should create an audit log record in database', async () => {
      mockPrisma.client.auditLog.create.mockResolvedValueOnce({
        id: 'audit-1',
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.DOCUMENT_INGESTED,
        resource: 'Document:doc-123',
        details: { title: 'Q4 Strategy.pdf' },
        createdAt: new Date(),
      });

      await service.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.DOCUMENT_INGESTED,
        resource: 'Document:doc-123',
        details: { title: 'Q4 Strategy.pdf' },
      });

      expect(mockPrisma.client.auditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: AuditAction.DOCUMENT_INGESTED,
          resource: 'Document:doc-123',
          details: { title: 'Q4 Strategy.pdf' },
        },
      });
    });

    it('should not throw if database insertion fails (resilience check)', async () => {
      mockPrisma.client.auditLog.create.mockRejectedValueOnce(new Error('DB Connection Timeout'));

      await expect(
        service.recordEvent({
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: AuditAction.PII_FLAGGED,
          resource: 'UserQueryPrompt',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getAuditLogs', () => {
    it('should enforce tenant isolation and return paginated logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: AuditAction.DOCUMENT_INGESTED,
          resource: 'Document:doc-1',
          details: { title: 'HandBook.pdf' },
          createdAt: new Date('2026-11-18T00:00:00.000Z'),
          user: {
            email: 'admin@company.com',
            name: 'Security Admin',
          },
        },
      ];

      mockPrisma.client.auditLog.count.mockResolvedValueOnce(1);
      mockPrisma.client.auditLog.findMany.mockResolvedValueOnce(mockLogs);

      const result = await service.getAuditLogs(tenant, {
        page: 1,
        limit: 10,
        action: AuditAction.DOCUMENT_INGESTED,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].userEmail).toBe('admin@company.com');
      expect(result.items[0].action).toBe(AuditAction.DOCUMENT_INGESTED);

      // Verify tenant isolation filter
      expect(mockPrisma.client.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: tenant.organizationId,
            action: AuditAction.DOCUMENT_INGESTED,
          }),
        }),
      );
    });

    it('should apply date range and search filters', async () => {
      mockPrisma.client.auditLog.count.mockResolvedValueOnce(0);
      mockPrisma.client.auditLog.findMany.mockResolvedValueOnce([]);

      await service.getAuditLogs(tenant, {
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-18T23:59:59.000Z',
        search: 'PII_FLAGGED',
      });

      expect(mockPrisma.client.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: tenant.organizationId,
            createdAt: expect.objectContaining({
              gte: new Date('2026-11-01T00:00:00.000Z'),
              lte: new Date('2026-11-18T23:59:59.000Z'),
            }),
            OR: expect.arrayContaining([
              { action: { contains: 'PII_FLAGGED', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('exportAuditLogsCsv', () => {
    it('should format logs into RFC-4180 CSV with anti-formula injection sanitization', async () => {
      const mockLogs = [
        {
          id: 'log-malicious',
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: '=cmd|"/c calc"!A0', // Attacker payload attempting CSV formula injection
          resource: '+123456789',
          details: { note: 'malicious injection test' },
          createdAt: new Date('2026-11-18T01:00:00.000Z'),
          user: {
            email: 'attacker@company.com',
            name: '@CEO',
          },
        },
      ];

      mockPrisma.client.auditLog.count.mockResolvedValueOnce(1);
      mockPrisma.client.auditLog.findMany.mockResolvedValueOnce(mockLogs);

      const csv = await service.exportAuditLogsCsv(tenant, {});

      // Header row check
      expect(csv).toContain('"Timestamp","Action","Resource","User Email","User Name","Details"');

      // CSV Injection checks: leading '=', '+', '@' should be prefixed with single quote "'"
      expect(csv).toContain("\"'=cmd");
      expect(csv).toContain("\"'+123456789");
      expect(csv).toContain("\"'@CEO");
    });

    it('should return org-wide summary counts via groupBy when available', async () => {
      mockPrisma.client.auditLog.count.mockResolvedValueOnce(50);
      mockPrisma.client.auditLog.findMany.mockResolvedValueOnce([]);
      mockPrisma.client.auditLog.groupBy = vi.fn().mockResolvedValueOnce([
        { action: AuditAction.PII_FLAGGED, _count: { _all: 7 } },
        { action: AuditAction.DOCUMENT_INGESTED, _count: { _all: 12 } },
        { action: AuditAction.DOCUMENT_DELETED, _count: { _all: 3 } },
        { action: AuditAction.KNOWLEDGE_GAP_RESOLVED, _count: { _all: 4 } },
        { action: AuditAction.KNOWLEDGE_GAP_ASSIGNED, _count: { _all: 2 } },
      ]);

      const result = await service.getAuditLogs(tenant, { page: 1, limit: 25 });
      expect(result.summary).toEqual({
        piiRedactions: 7,
        documentOperations: 15,
        governanceActions: 6,
      });
    });
  });
});
