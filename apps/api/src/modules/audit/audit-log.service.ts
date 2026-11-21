import { Injectable, Logger } from '@nestjs/common';
import { AuditLogItem, AuditAction, PaginatedAuditLogsResponse, TenantContext } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Centralized event recorder with resilient error handling.
   * Ensures audit event failures never disrupt primary user journeys.
   */
  async recordEvent(params: {
    organizationId: string;
    userId: string;
    action: AuditAction | string;
    resource: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.client.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          details: params.details as any,
        },
      });
      this.logger.log(`Audit recorded: [${params.action}] on [${params.resource}] by user [${params.userId}]`);
    } catch (error) {
      this.logger.error(`Failed to record audit log for action ${params.action}:`, error);
    }
  }

  /**
   * Retrieves paginated and filtered audit logs for an organization.
   * Strictly enforces multi-tenant boundary.
   */
  async getAuditLogs(
    tenant: TenantContext,
    query: QueryAuditLogsDto,
    maxLimit = 100,
  ): Promise<PaginatedAuditLogsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= maxLimit ? query.limit : 25;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organizationId: tenant.organizationId,
    };

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.resource) {
      where.resource = { contains: query.resource, mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.startDate) {
        createdAtFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        createdAtFilter.lte = new Date(query.endDate);
      }
      where.createdAt = createdAtFilter;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const db =
      typeof (this.prisma as unknown as { forTenant?: (orgId: string) => unknown }).forTenant === 'function'
        ? (this.prisma as unknown as { forTenant: (orgId: string) => typeof this.prisma.client }).forTenant(
            tenant.organizationId,
          )
        : this.prisma.client;

    const auditModel = db.auditLog as unknown as {
      count: typeof db.auditLog.count;
      findMany: typeof db.auditLog.findMany;
      groupBy?: (args: {
        by: ['action'];
        where: { organizationId: string };
        _count: { _all: true };
      }) => Promise<Array<{ action: string; _count: { _all: number } }>>;
    };

    const actionGroupsPromise =
      typeof auditModel.groupBy === 'function'
        ? auditModel
            .groupBy({
              by: ['action'],
              where: { organizationId: tenant.organizationId },
              _count: { _all: true },
            })
            .catch(() => null)
        : Promise.resolve(null);

    const [total, logs, actionGroups] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
      actionGroupsPromise,
    ]);

    const items: AuditLogItem[] = (
      logs as Array<{
        id: string;
        organizationId: string;
        userId: string;
        action: string;
        resource: string;
        details: unknown;
        createdAt: Date;
        user?: { email?: string | null; name?: string | null } | null;
      }>
    ).map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      userId: log.userId,
      userEmail: log.user?.email || 'Unknown',
      userName: log.user?.name || undefined,
      action: log.action,
      resource: log.resource,
      details: (log.details as Record<string, unknown>) || null,
      createdAt: log.createdAt.toISOString(),
    }));

    let summary: PaginatedAuditLogsResponse['summary'];
    if (Array.isArray(actionGroups)) {
      let piiRedactions = 0;
      let documentOperations = 0;
      let governanceActions = 0;
      for (const row of actionGroups) {
        const count = row._count?._all ?? 0;
        if (row.action === AuditAction.PII_FLAGGED) {
          piiRedactions += count;
        } else if (
          row.action === AuditAction.DOCUMENT_INGESTED ||
          row.action === AuditAction.DOCUMENT_DELETED
        ) {
          documentOperations += count;
        } else if (
          row.action === AuditAction.KNOWLEDGE_GAP_RESOLVED ||
          row.action === AuditAction.KNOWLEDGE_GAP_ASSIGNED
        ) {
          governanceActions += count;
        }
      }
      summary = { piiRedactions, documentOperations, governanceActions };
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      ...(summary ? { summary } : {}),
    };
  }

  /**
   * Generates RFC-4180 compliant CSV export with anti-formula injection defenses.
   */
  async exportAuditLogsCsv(
    tenant: TenantContext,
    query: QueryAuditLogsDto,
  ): Promise<string> {
    const EXPORT_MAX_ROWS = 1000;
    const response = await this.getAuditLogs(
      tenant,
      {
        ...query,
        page: 1,
        limit: EXPORT_MAX_ROWS,
      },
      EXPORT_MAX_ROWS,
    );

    const headers = ['Timestamp', 'Action', 'Resource', 'User Email', 'User Name', 'Details'];
    const rows = response.items.map((item) => [
      item.createdAt,
      item.action,
      item.resource,
      item.userEmail,
      item.userName || '',
      item.details ? JSON.stringify(item.details) : '',
    ]);

    const sanitizeCell = (value: string): string => {
      let cell = value.replace(/"/g, '""');
      // Anti-CSV formula injection check (=, +, -, @, \t, \r)
      if (/^[=+\-@\t\r]/.test(cell)) {
        cell = `'${cell}`;
      }
      return `"${cell}"`;
    };

    const csvContent = [
      headers.map(sanitizeCell).join(','),
      ...rows.map((row) => row.map(sanitizeCell).join(',')),
    ].join('\r\n');

    return csvContent;
  }
}
