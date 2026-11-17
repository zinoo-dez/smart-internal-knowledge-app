import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditAction, TenantContext, UserRole } from '@knowledge/shared';
import { AuditLogsController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let mockAuditLogService: any;

  const tenant: TenantContext = {
    organizationId: 'org-tenant-123',
    userId: 'user-admin-456',
    userRole: UserRole.ADMIN,
    userEmail: 'security@company.com',
  };

  beforeEach(() => {
    mockAuditLogService = {
      getAuditLogs: vi.fn(),
      exportAuditLogsCsv: vi.fn(),
    };

    controller = new AuditLogsController(mockAuditLogService as unknown as AuditLogService);
  });

  describe('getAuditLogs', () => {
    it('should forward query parameters and tenant to service', async () => {
      const mockResult = {
        items: [
          {
            id: 'audit-1',
            organizationId: tenant.organizationId,
            userId: tenant.userId,
            userEmail: 'security@company.com',
            action: AuditAction.DOCUMENT_INGESTED,
            resource: 'Document:doc-1',
            details: null,
            createdAt: '2026-11-18T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
        totalPages: 1,
      };

      mockAuditLogService.getAuditLogs.mockResolvedValueOnce(mockResult);

      const query = { page: 1, limit: 25, action: AuditAction.DOCUMENT_INGESTED };
      const response = await controller.getAuditLogs(tenant, query);

      expect(response).toEqual(mockResult);
      expect(mockAuditLogService.getAuditLogs).toHaveBeenCalledWith(tenant, query);
    });
  });

  describe('exportAuditLogs', () => {
    it('should stream CSV content with proper attachment headers', async () => {
      const mockCsv = '"Timestamp","Action","Resource"\r\n"2026-11-18","DOCUMENT_INGESTED","Document:1"';
      mockAuditLogService.exportAuditLogsCsv.mockResolvedValueOnce(mockCsv);

      const mockRes: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await controller.exportAuditLogs(tenant, {}, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="audit-logs-'),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(mockCsv);
    });
  });
});
