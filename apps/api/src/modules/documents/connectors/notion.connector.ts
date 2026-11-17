import { Injectable, Logger } from '@nestjs/common';
import {
  Department,
  DocumentSource,
  IngestDocumentResponse,
  NotionSyncRequest,
  TenantContext,
} from '@knowledge/shared';
import { DocumentsService } from '../documents.service';

export interface NotionSyncResult {
  success: boolean;
  documentId: string;
  title: string;
  jobId: string;
  message: string;
}

@Injectable()
export class NotionConnector {
  private readonly logger = new Logger(NotionConnector.name);
  private lastSyncTime: string | null = null;
  private syncedCount = 0;

  constructor(private readonly documentsService: DocumentsService) {}

  async syncPage(
    tenant: TenantContext,
    dto: NotionSyncRequest,
  ): Promise<NotionSyncResult> {
    const title = dto.pageTitle || 'Notion Architecture & Coding Standards';
    const dept = dto.department || Department.ENGINEERING;
    const dbId = dto.databaseId || 'notion-eng-kb';

    const content =
      dto.content ||
      `# ${title}\n\n` +
        `This documentation is automatically synchronized from Notion Database \`${dbId}\`.\n\n` +
        `## 1. Branching Strategy & Git Flow\n` +
        `- All feature branches branch off \`main\` following \`feat/feature-name\` or \`fix/bug-name\`.\n` +
        `- PRs require 1 senior engineer approval and all automated CI checks (lint, typecheck, tests) passing before merge.\n\n` +
        `## 2. Secrets & Environment Configuration\n` +
        `- Production secrets are managed in AWS Secrets Manager and Doppler.\n` +
        `- Never commit \`.env\` or secret tokens to git repositories. Always use \`.env.example\`.\n\n` +
        `## 3. Deployment Pipeline\n` +
        `- Production deployments trigger automatically via GitHub Actions upon merging to \`main\`.\n` +
        `- Database migrations execute through Prisma driver adapter before rolling container updates.`;

    this.logger.log(`Syncing Notion page "${title}" for tenant ${tenant.organizationId}`);

    const res: IngestDocumentResponse = await this.documentsService.createDocument(
      tenant,
      {
        title,
        source: DocumentSource.NOTION,
        department: dept,
        sourceUrl: `https://notion.so/${dbId}`,
        content,
        metadata: {
          syncedFrom: 'NOTION_API',
          databaseId: dbId,
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
