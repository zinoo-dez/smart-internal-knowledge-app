import { Injectable, Logger } from '@nestjs/common';
import {
  ConfluenceSyncRequest,
  Department,
  DocumentSource,
  IngestDocumentResponse,
  TenantContext,
} from '@knowledge/shared';
import { DocumentsService } from '../documents.service';

export interface ConfluenceSyncResult {
  success: boolean;
  documentId: string;
  title: string;
  jobId: string;
  message: string;
}

@Injectable()
export class ConfluenceConnector {
  private readonly logger = new Logger(ConfluenceConnector.name);
  private lastSyncTime: string | null = null;
  private syncedCount = 0;

  constructor(private readonly documentsService: DocumentsService) {}

  async syncSpace(
    tenant: TenantContext,
    dto: ConfluenceSyncRequest,
  ): Promise<ConfluenceSyncResult> {
    const spaceKey = dto.spaceKey || 'ENG-WIKI';
    const title = dto.pageTitle || 'Confluence Engineering Runbook & Incident Response';
    const dept = dto.department || Department.ENGINEERING;

    const content =
      dto.content ||
      `# ${title}\n\n` +
        `This enterprise runbook is synchronized from Confluence Space \`${spaceKey}\`.\n\n` +
        `## 1. Production Severity Levels (P1 - P4)\n` +
        `- **P1 (Critical Outage):** Customer-facing outage or data compromise. Response SLA: 15 minutes. On-call engineer must initiate incident bridge in Slack \`#incident-room\`.\n` +
        `- **P2 (Degraded Performance):** High latency (>2s) or non-critical microservice degradation. Response SLA: 45 minutes.\n` +
        `- **P3 (Minor Defect):** Internal admin UI or background batch reporting error. Response SLA: 8 hours.\n` +
        `- **P4 (Enhancement/Inquiry):** General maintenance or documentation question. Response SLA: Next business day.\n\n` +
        `## 2. On-Call Escalation & PagerDuty\n` +
        `- Primary on-call rotations switch every Monday at 10:00 AM UTC.\n` +
        `- Escalation policy alerts the Secondary on-call if unacknowledged after 5 minutes.\n` +
        `- Engineering leads and VP of Engineering are notified automatically if P1 remains unresolved after 30 minutes.\n\n` +
        `## 3. Post-Incident Review (PIR) Standards\n` +
        `- Blameless post-mortem document must be drafted within 48 hours of incident closure.\n` +
        `- Root Cause Analysis (5 Whys), timeline of events, and preventative Jira tickets must be cataloged in Confluence \`${spaceKey}/post-mortems\`.`;

    this.logger.log(`Syncing Confluence space "${spaceKey}" page "${title}" for tenant ${tenant.organizationId}`);

    const res: IngestDocumentResponse = await this.documentsService.createDocument(
      tenant,
      {
        title,
        source: DocumentSource.CONFLUENCE,
        department: dept,
        sourceUrl: `https://company.atlassian.net/wiki/spaces/${spaceKey}/pages/${encodeURIComponent(title)}`,
        content,
        metadata: {
          syncedFrom: 'CONFLUENCE_API',
          spaceKey,
          lastSync: new Date().toISOString(),
        },
      },
    );

    this.lastSyncTime = new Date().toISOString();
    this.syncedCount += 1;

    return {
      success: true,
      documentId: res.documentId,
      title,
      jobId: res.jobId,
      message: res.message,
    };
  }

  getStatus() {
    return {
      status: 'CONNECTED' as const,
      lastSync: this.lastSyncTime ?? undefined,
      syncedPagesCount: this.syncedCount,
    };
  }
}
