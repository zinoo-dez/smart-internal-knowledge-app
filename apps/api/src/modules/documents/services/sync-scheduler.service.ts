import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectorScheduleStatus,
  DocumentSource,
  TenantContext,
} from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotionConnector } from '../connectors/notion.connector';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private lastCronRun: string | null = null;
  private readonly cronSchedule = '0 2 * * *'; // Nightly at 2:00 AM UTC

  constructor(
    private readonly prisma: PrismaService,
    private readonly notionConnector: NotionConnector,
  ) {}

  async getScheduleStatus(tenant: TenantContext): Promise<ConnectorScheduleStatus> {
    const orgId = tenant.organizationId;
    const staleThreshold = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const staleCount = await this.prisma.client.document.count({
      where: {
        organizationId: orgId,
        updatedAt: { lt: staleThreshold },
      },
    });

    const nextRun = new Date();
    nextRun.setUTCHours(2, 0, 0, 0);
    if (nextRun.getTime() <= Date.now()) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    return {
      enabled: true,
      cronSchedule: this.cronSchedule,
      lastRunAt: this.lastCronRun ?? undefined,
      nextRunAt: nextRun.toISOString(),
      staleDocumentsCount: staleCount,
    };
  }

  async runScheduledSync(
    tenant: TenantContext,
  ): Promise<{ success: boolean; syncedCount: number; staleCount: number }> {
    this.logger.log(`Executing automated cron sync for tenant ${tenant.organizationId}`);
    const orgId = tenant.organizationId;

    // 1. Fetch connected SaaS documents (Notion & Drive)
    const connectedDocs = await this.prisma.client.document.findMany({
      where: {
        organizationId: orgId,
        source: { in: [DocumentSource.NOTION, DocumentSource.GOOGLE_DRIVE] },
      },
    });

    let syncedCount = 0;
    for (const doc of connectedDocs) {
      if (doc.source === DocumentSource.NOTION) {
        await this.notionConnector.syncPage(tenant, {
          databaseId: (doc.metadata as any)?.databaseId || 'cron-workspace',
          pageTitle: doc.title,
          department: doc.department as any,
        });
        syncedCount++;
      }
    }

    const scheduleStatus = await this.getScheduleStatus(tenant);
    this.lastCronRun = new Date().toISOString();

    return {
      success: true,
      syncedCount,
      staleCount: scheduleStatus.staleDocumentsCount,
    };
  }
}
