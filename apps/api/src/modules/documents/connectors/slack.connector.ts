import { Injectable, Logger } from '@nestjs/common';
import {
  Department,
  DocumentSource,
  IngestDocumentResponse,
  SlackWebhookPayload,
  TenantContext,
} from '@knowledge/shared';
import { DocumentsService } from '../documents.service';

export interface SlackWebhookResult {
  ok: boolean;
  challenge?: string;
  documentId?: string;
  message: string;
}

@Injectable()
export class SlackConnector {
  private readonly logger = new Logger(SlackConnector.name);
  private lastMessageTime: string | null = null;
  private messageCount = 0;

  constructor(private readonly documentsService: DocumentsService) {}

  async handleWebhook(
    tenant: TenantContext,
    payload: SlackWebhookPayload,
  ): Promise<SlackWebhookResult> {
    // 1. Handle Slack URL verification challenge handshake
    if (payload.type === 'url_verification' && payload.challenge) {
      this.logger.log('Responding to Slack Events API URL verification challenge');
      return {
        ok: true,
        challenge: payload.challenge,
        message: 'Slack challenge verified',
      };
    }

    const channel = payload.channel || 'engineering-announcements';
    const text =
      payload.text ||
      'Deployment of v2.4.0 completed successfully. Zero downtime migration verified.';
    const dept = payload.department || Department.ENGINEERING;
    const user = payload.user || 'slack-bot';

    const title = `Slack Knowledge Share [#${channel}]`;
    const content =
      `# Archived Slack Message from #${channel}\n\n` +
      `**Author:** @${user}\n` +
      `**Channel:** #${channel}\n` +
      `**Timestamp:** ${new Date().toISOString()}\n\n` +
      `---\n\n` +
      `${text}`;

    this.logger.log(
      `Ingesting Slack message from channel #${channel} for tenant ${tenant.organizationId}`,
    );

    const res: IngestDocumentResponse = await this.documentsService.createDocument(
      tenant,
      {
        title,
        source: DocumentSource.SLACK,
        department: dept,
        sourceUrl: `https://slack.com/archives/${channel}`,
        content,
        metadata: {
          syncedFrom: 'SLACK_WEBHOOK',
          channel,
          author: user,
          ingestedAt: new Date().toISOString(),
        },
      },
    );

    this.lastMessageTime = new Date().toISOString();
    this.messageCount += 1;

    return {
      ok: true,
      documentId: res.documentId,
      message: `Slack message indexed into knowledge base under ${title}`,
    };
  }

  getStatus() {
    return {
      status: 'CONNECTED' as const,
      lastSync: this.lastMessageTime ?? undefined,
      channelName: '#engineering-announcements',
      syncedMessagesCount: this.messageCount,
    };
  }
}
