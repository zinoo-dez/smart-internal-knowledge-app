import {
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  AuditAction,
  Department,
  DocumentCitation,
  SlackBlockKitMessage,
  SlackEventPayload,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { RagAgentService } from '../../chat/rag-agent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';

@Injectable()
export class SlackBotService {
  private readonly logger = new Logger(SlackBotService.name);

  constructor(
    @Inject(forwardRef(() => RagAgentService))
    private readonly ragAgentService: RagAgentService,
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  /**
   * Verifies Slack request signature using HMAC-SHA256 to prevent unauthorized webhook spoofing.
   */
  verifySlackSignature(
    signature?: string,
    timestamp?: string,
    rawBody?: string,
    signingSecret?: string,
  ): boolean {
    const secret = signingSecret || process.env.SLACK_SIGNING_SECRET;
    if (!secret) {
      // In production, fail-closed: missing signing secret must reject requests
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Slack webhook rejected: SLACK_SIGNING_SECRET is not configured in production.');
        return false;
      }
      // In development / testing without secret, allow request
      return true;
    }

    if (!signature || !timestamp || !rawBody) {
      return false;
    }

    // Replay attack defense: check timestamp within 5 minutes (300 seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 300) {
      this.logger.warn(`Slack request rejected: timestamp difference > 300s (replay protection)`);
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', secret);
    const mySignature = `v0=${hmac.update(sigBasestring).digest('hex')}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Primary entrypoint for Slack Events API.
   * Responds immediately with HTTP 200 within 3 seconds, offloading RAG processing asynchronously.
   */
  async handleSlackEvent(
    payload: SlackEventPayload,
    rawBody = '',
    signature?: string,
    timestamp?: string,
  ): Promise<{ ok: boolean; challenge?: string; message: string }> {
    // 1. URL verification handshake
    if (payload.type === 'url_verification' && payload.challenge) {
      this.logger.log('Responding to Slack Events API URL verification challenge');
      return {
        ok: true,
        challenge: payload.challenge,
        message: 'URL verification challenge verified',
      };
    }

    // 2. Validate Slack cryptographic signature
    if (process.env.SLACK_SIGNING_SECRET) {
      const isValid = this.verifySlackSignature(signature, timestamp, rawBody);
      if (!isValid) {
        throw new UnauthorizedException('Invalid or expired Slack request signature');
      }
    }

    // 3. Handle app_mention event
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;

      // Prevent bot loop: ignore messages sent by bots
      if (event.bot_id || event.subtype === 'bot_message') {
        return { ok: true, message: 'Ignored bot message' };
      }

      if (event.type === 'app_mention') {
        const cleanedQuery = this.cleanUserQuery(event.text);

        // Offload RAG answering asynchronously to satisfy Slack's 3-second timeout SLA
        setImmediate(async () => {
          try {
            await this.processAppMention(event, cleanedQuery);
          } catch (err: unknown) {
            const error = err as Error;
            this.logger.error(`Error processing Slack app_mention: ${error.message}`);
          }
        });

        return { ok: true, message: 'App mention queued for processing' };
      }
    }

    return { ok: true, message: 'Slack event received' };
  }

  /**
   * Asynchronous background worker generating RAG answer and posting Slack Block Kit.
   */
  async processAppMention(
    event: NonNullable<SlackEventPayload['event']>,
    query: string,
  ): Promise<SlackBlockKitMessage> {
    const threadTs = event.thread_ts || event.ts;
    const channel = event.channel;

    if (!query) {
      const emptyHelpBlock = {
        channel,
        thread_ts: threadTs,
        text: 'Hello! Ask me any company question like `@KnowledgeAssistant what is our VPN policy?`',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '👋 *Hello!* Mention me with any internal company policy or technical question.\n\n*Example:* `@KnowledgeAssistant How do I connect to AWS via WireGuard?`',
            },
          },
        ],
      };
      await this.postMessageToSlack(emptyHelpBlock);
      return emptyHelpBlock;
    }

    // Resolve Slack user's organization & department ACL
    const tenant = await this.resolveTenantContext(event.user);

    this.logger.log(
      `Generating RAG answer for Slack query: "${query}" (User: ${event.user}, Dept: ${tenant.department})`,
    );

    const { text, citations } = await this.ragAgentService.generateAnswer(tenant, query);

    const message = this.formatSlackBlockKit({
      answerText: text,
      citations,
      originalQuery: query,
      channel,
      threadTs,
    });

    await this.postMessageToSlack(message);

    if (this.auditLogService) {
      await this.auditLogService.recordEvent({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: AuditAction.QUERY_EXECUTED,
        resource: 'SlackBotMention',
        details: {
          channel,
          slackUser: event.user,
          queryLength: query.length,
          citationsCount: citations.length,
        },
      });
    }

    return message;
  }

  /**
   * Strips Slack bot mention tags (e.g. <@U12345678>) from query text.
   */
  cleanUserQuery(text: string): string {
    return text.replace(/<@[A-Z0-9]+>/g, '').trim();
  }

  /**
   * Formats grounded answer and citations into rich Slack Block Kit layout.
   */
  formatSlackBlockKit(params: {
    answerText: string;
    citations: DocumentCitation[];
    originalQuery: string;
    channel: string;
    threadTs?: string;
  }): SlackBlockKitMessage {
    const blocks: Array<Record<string, unknown>> = [];

    // 1. Primary Answer Block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: params.answerText,
      },
    });

    // 2. Verified Sources Block
    if (params.citations && params.citations.length > 0) {
      const sourceLinks = params.citations
        .map((c, i) => {
          const url = c.sourceUrl || `http://localhost:3000/admin/documents`;
          return `*[${i + 1}]* <${url}|${c.documentTitle}>`;
        })
        .join('  •  ');

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📚 *Verified Internal Sources:*  ${sourceLinks}`,
          },
        ],
      });
    }

    // 3. Interactive Action Buttons
    const encodedQuery = encodeURIComponent(params.originalQuery);
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open in Assistant' },
          url: `http://localhost:3000/chat?q=${encodedQuery}`,
          action_id: 'open_web_assistant',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Create IT Ticket' },
          action_id: 'create_ticket',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '👍 Helpful' },
          action_id: 'feedback_thumbs_up',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '👎 Inaccurate' },
          action_id: 'feedback_thumbs_down',
        },
      ],
    });

    return {
      channel: params.channel,
      thread_ts: params.threadTs,
      text: params.answerText.slice(0, 150) + '...',
      blocks,
    };
  }

  /**
   * Resolves the Slack user to an organization and department ACL.
   */
  private async resolveTenantContext(slackUserId: string): Promise<TenantContext> {
    try {
      const user = await this.prisma.client.user.findFirst({
        where: { clerkUserId: slackUserId },
      });

      if (user) {
        return {
          organizationId: user.organizationId,
          userId: user.id,
          userRole: user.role as UserRole,
          userEmail: user.email,
          department: user.department as Department,
        };
      }
    } catch (err) {
      this.logger.debug(`Could not find DB user for Slack ID ${slackUserId}: ${err}`);
    }

    // Safe fallback to public company-wide access
    return {
      organizationId: 'mock-org-default',
      userId: `slack-${slackUserId || 'anonymous'}`,
      userRole: UserRole.MEMBER,
      userEmail: `${slackUserId || 'user'}@slack.internal`,
      department: Department.ALL,
    };
  }

  /**
   * Posts message payload to Slack Web API chat.postMessage endpoint.
   */
  private async postMessageToSlack(message: SlackBlockKitMessage): Promise<void> {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      this.logger.log(
        `[SLACK_BOT_MOCK] Post to #${message.channel} (Thread: ${message.thread_ts}): ${message.text}`,
      );
      return;
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!data.ok) {
        this.logger.error(`Slack chat.postMessage failed: ${data.error}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to post message to Slack API: ${error.message}`);
    }
  }
}
