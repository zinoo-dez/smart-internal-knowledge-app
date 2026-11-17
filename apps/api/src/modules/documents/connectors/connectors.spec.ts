import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotionConnector } from './notion.connector';
import { SlackConnector } from './slack.connector';
import { ConnectorsController } from './connectors.controller';
import {
  Department,
  DocumentSource,
  IngestionStatus,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { DocumentsService } from '../documents.service';
import { SyncSchedulerService } from '../services/sync-scheduler.service';

describe('Connectors (Notion & Slack SaaS Integrations)', () => {
  let documentsServiceMock: any;
  let syncSchedulerMock: any;
  let notionConnector: NotionConnector;
  let slackConnector: SlackConnector;
  let controller: ConnectorsController;

  const tenant: TenantContext = {
    organizationId: 'org-test-connectors',
    userId: 'admin-01',
    userRole: UserRole.ADMIN,
    userEmail: 'admin@company.com',
  };

  beforeEach(() => {
    documentsServiceMock = {
      createDocument: vi.fn().mockResolvedValue({
        documentId: 'doc-uuid-connector',
        status: IngestionStatus.PROCESSING,
        jobId: 'job-uuid-connector',
        message: 'Document queued for ingestion',
      }),
    };

    syncSchedulerMock = {
      getScheduleStatus: vi.fn().mockResolvedValue({
        enabled: true,
        cronSchedule: '0 2 * * *',
        nextRunAt: '2026-01-02T02:00:00Z',
        staleDocumentsCount: 2,
      }),
      runScheduledSync: vi.fn().mockResolvedValue({
        success: true,
        syncedCount: 3,
        staleCount: 2,
      }),
    };

    notionConnector = new NotionConnector(documentsServiceMock as DocumentsService);
    slackConnector = new SlackConnector(documentsServiceMock as DocumentsService);
    controller = new ConnectorsController(
      notionConnector,
      slackConnector,
      syncSchedulerMock as SyncSchedulerService,
    );
  });

  describe('NotionConnector', () => {
    it('should format Notion page and forward to DocumentsService with NOTION source', async () => {
      const result = await notionConnector.syncPage(tenant, {
        databaseId: 'eng-handbook-db',
        pageTitle: 'Frontend State Management Guide',
        department: Department.ENGINEERING,
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-uuid-connector');
      expect(result.title).toBe('Frontend State Management Guide');

      expect(documentsServiceMock.createDocument).toHaveBeenCalledWith(
        tenant,
        expect.objectContaining({
          title: 'Frontend State Management Guide',
          source: DocumentSource.NOTION,
          department: Department.ENGINEERING,
          sourceUrl: 'https://notion.so/eng-handbook-db',
          content: expect.stringContaining('Branching Strategy'),
        }),
      );

      const status = notionConnector.getStatus();
      expect(status.status).toBe('CONNECTED');
      expect(status.syncedPagesCount).toBe(1);
      expect(status.lastSync).toBeDefined();
    });
  });

  describe('SlackConnector', () => {
    it('should answer Slack URL verification challenge handshake', async () => {
      const result = await slackConnector.handleWebhook(tenant, {
        type: 'url_verification',
        challenge: 'slack_challenge_token_xyz',
      });

      expect(result.ok).toBe(true);
      expect(result.challenge).toBe('slack_challenge_token_xyz');
      expect(documentsServiceMock.createDocument).not.toHaveBeenCalled();
    });

    it('should ingest incoming Slack message into knowledge base with SLACK source', async () => {
      const result = await slackConnector.handleWebhook(tenant, {
        channel: 'dev-deployments',
        text: 'Cluster v1.31 upgraded successfully in us-east-1.',
        department: Department.OPERATIONS,
        user: 'ops-lead',
      });

      expect(result.ok).toBe(true);
      expect(result.documentId).toBe('doc-uuid-connector');
      expect(documentsServiceMock.createDocument).toHaveBeenCalledWith(
        tenant,
        expect.objectContaining({
          title: 'Slack Knowledge Share [#dev-deployments]',
          source: DocumentSource.SLACK,
          department: Department.OPERATIONS,
          sourceUrl: 'https://slack.com/archives/dev-deployments',
          content: expect.stringContaining('Cluster v1.31 upgraded successfully'),
        }),
      );

      const status = slackConnector.getStatus();
      expect(status.status).toBe('CONNECTED');
      expect(status.syncedMessagesCount).toBe(1);
    });
  });

  describe('ConnectorsController', () => {
    it('should aggregate live status for all SaaS connectors including cron schedule', async () => {
      const status = await controller.getStatus(tenant);

      expect(status.notion.status).toBe('CONNECTED');
      expect(status.slack.status).toBe('CONNECTED');
      expect(status.slack.channelName).toBe('#engineering-announcements');
      expect(status.schedule?.enabled).toBe(true);
      expect(status.schedule?.staleDocumentsCount).toBe(2);
    });

    it('should trigger on-demand scheduled background sync', async () => {
      const res = await controller.triggerScheduledSync(tenant);
      expect(res.success).toBe(true);
      expect(res.syncedCount).toBe(3);
      expect(syncSchedulerMock.runScheduledSync).toHaveBeenCalledWith(tenant);
    });

    it('should route Notion sync endpoint properly', async () => {
      const syncRes = await controller.syncNotion(tenant, {
        pageTitle: 'Product Vision 2026',
        department: Department.EXECUTIVE,
      });

      expect(syncRes.success).toBe(true);
      expect(documentsServiceMock.createDocument).toHaveBeenCalled();
    });
  });
});
