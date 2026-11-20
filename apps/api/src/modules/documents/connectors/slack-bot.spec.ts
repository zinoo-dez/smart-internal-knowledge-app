import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import { Department, DocumentSource, SlackEventPayload } from '@knowledge/shared';
import { SlackBotService } from './slack-bot.service';
import { SlackEventsController } from './slack-events.controller';
import { RagAgentService } from '../../chat/rag-agent.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SlackBotService & SlackEventsController', () => {
  let slackBotService: SlackBotService;
  let slackEventsController: SlackEventsController;
  let mockRagAgentService: any;
  let mockPrisma: any;

  const TEST_SIGNING_SECRET = 'slack_test_secret_12345';

  beforeEach(() => {
    mockRagAgentService = {
      generateAnswer: vi.fn().mockResolvedValue({
        text: 'To connect to WireGuard VPN, download the configuration file from 1Password and import into the WireGuard Mac app [1].',
        citations: [
          {
            chunkId: 'chunk-1',
            documentId: 'doc-vpn',
            documentTitle: 'VPN Setup Handbook',
            source: DocumentSource.FILE_UPLOAD,
            sourceUrl: 'https://notion.so/vpn',
            snippet: 'WireGuard setup steps...',
            relevanceScore: 0.95,
          },
        ],
      }),
    };

    mockPrisma = {
      client: {
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'user-db-123',
            clerkUserId: 'U12345678',
            organizationId: 'org-slack-tenant',
            email: 'dev@company.com',
            role: 'MEMBER',
            department: Department.ENGINEERING,
          }),
        },
      },
    };

    slackBotService = new SlackBotService(
      mockRagAgentService as unknown as RagAgentService,
      mockPrisma as unknown as PrismaService,
    );

    slackEventsController = new SlackEventsController(slackBotService);
  });

  describe('Slack Cryptographic Signature Verification', () => {
    it('should validate authentic HMAC-SHA256 signature matching Slack specification', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const rawBody = JSON.stringify({ type: 'url_verification', challenge: 'test_challenge' });

      const sigBasestring = `v0:${timestamp}:${rawBody}`;
      const hash = crypto
        .createHmac('sha256', TEST_SIGNING_SECRET)
        .update(sigBasestring)
        .digest('hex');
      const validSignature = `v0=${hash}`;

      const isValid = slackBotService.verifySlackSignature(
        validSignature,
        timestamp,
        rawBody,
        TEST_SIGNING_SECRET,
      );

      expect(isValid).toBe(true);
    });

    it('should reject tampered or forged signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const rawBody = '{"type":"url_verification"}';
      const forgedSignature = 'v0=0000000000000000000000000000000000000000000000000000000000000000';

      const isValid = slackBotService.verifySlackSignature(
        forgedSignature,
        timestamp,
        rawBody,
        TEST_SIGNING_SECRET,
      );

      expect(isValid).toBe(false);
    });

    it('should reject expired requests to defend against replay attacks (> 300s)', () => {
      const expiredTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400s ago
      const rawBody = '{"type":"app_mention"}';

      const sigBasestring = `v0:${expiredTimestamp}:${rawBody}`;
      const hash = crypto
        .createHmac('sha256', TEST_SIGNING_SECRET)
        .update(sigBasestring)
        .digest('hex');
      const signature = `v0=${hash}`;

      const isValid = slackBotService.verifySlackSignature(
        signature,
        expiredTimestamp,
        rawBody,
        TEST_SIGNING_SECRET,
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Slack Events API Handler', () => {
    it('should answer url_verification challenge handshake immediately', async () => {
      const payload: SlackEventPayload = {
        type: 'url_verification',
        challenge: 'verify_challenge_string_999',
      };

      const response = await slackEventsController.handleSlackEvents(payload);

      expect(response.ok).toBe(true);
      expect(response.challenge).toBe('verify_challenge_string_999');
    });

    it('should prevent bot loops by ignoring bot messages', async () => {
      const botPayload: SlackEventPayload = {
        type: 'event_callback',
        event: {
          type: 'message',
          user: 'B01234567',
          bot_id: 'B01234567',
          text: 'I am a bot',
          channel: 'C123',
          ts: '1234567890.000100',
        },
      };

      const response = await slackEventsController.handleSlackEvents(botPayload);

      expect(response.ok).toBe(true);
      expect(response.message).toBe('Ignored bot message');
      expect(mockRagAgentService.generateAnswer).not.toHaveBeenCalled();
    });

    it('should process app_mention by resolving ACL and generating grounded Block Kit answer', async () => {
      const appMentionPayload: SlackEventPayload = {
        type: 'event_callback',
        event: {
          type: 'app_mention',
          user: 'U12345678',
          text: '<@U0BOT12345> how do I connect to VPN?',
          channel: 'C_TECH_HELP',
          ts: '1700000000.000200',
          thread_ts: '1700000000.000100',
        },
      };

      // Direct process test
      const resultMessage = await slackBotService.processAppMention(
        appMentionPayload.event!,
        'how do I connect to VPN?',
      );

      expect(resultMessage.channel).toBe('C_TECH_HELP');
      expect(resultMessage.thread_ts).toBe('1700000000.000100');
      expect(resultMessage.blocks).toHaveLength(3); // Answer, Citations Context, and Action Buttons

      // Verify RAG Agent was invoked with user's department ACL (ENGINEERING)
      expect(mockRagAgentService.generateAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-slack-tenant',
          department: Department.ENGINEERING,
        }),
        'how do I connect to VPN?',
      );

      // Verify Block Kit content
      const textBlock = resultMessage.blocks[0] as any;
      expect(textBlock.text.text).toContain('download the configuration file');

      const contextBlock = resultMessage.blocks[1] as any;
      expect(contextBlock.elements[0].text).toContain('VPN Setup Handbook');

      const actionsBlock = resultMessage.blocks[2] as any;
      expect(actionsBlock.elements).toHaveLength(4);
      expect(actionsBlock.elements[0].text.text).toBe('Open in Assistant');
      expect(actionsBlock.elements[1].text.text).toBe('Create IT Ticket');
    });

    it('should provide prompt guidance when user mentions bot with empty text', async () => {
      const emptyMentionEvent = {
        type: 'app_mention',
        user: 'U12345678',
        text: '<@U0BOT12345>',
        channel: 'C_RANDOM',
        ts: '1700000000.000300',
      };

      const result = await slackBotService.processAppMention(emptyMentionEvent, '');

      expect(result.channel).toBe('C_RANDOM');
      const textBlock = result.blocks[0] as any;
      expect(textBlock.text.text).toContain('Mention me with any internal company policy');
      expect(mockRagAgentService.generateAnswer).not.toHaveBeenCalled();
    });

    it('uses configurable WEB_APP_URL in Slack Block Kit buttons and blocks unsafe javascript:// sourceUrl schemes', () => {
      const origUrl = process.env.WEB_APP_URL;
      process.env.WEB_APP_URL = 'https://knowledge.example.com/';

      try {
        const msg = slackBotService.formatSlackBlockKit({
          answerText: 'Grounded answer [1].',
          citations: [
            {
              chunkId: 'c1',
              documentId: 'd1',
              documentTitle: 'Unsafe Legacy Doc',
              source: DocumentSource.NOTION,
              sourceUrl: 'javascript:alert(1)',
              snippet: 'Snippet',
              relevanceScore: 0.9,
            },
          ],
          originalQuery: 'vpn policy',
          channel: 'C_GENERAL',
        });

        const contextBlock = msg.blocks[1] as any;
        expect(contextBlock.elements[0].text).not.toContain('javascript:');
        expect(contextBlock.elements[0].text).toContain('https://knowledge.example.com/admin/documents');

        const actionsBlock = msg.blocks[2] as any;
        expect(actionsBlock.elements[0].url).toBe('https://knowledge.example.com/chat?q=vpn%20policy');
      } finally {
        if (origUrl !== undefined) {
          process.env.WEB_APP_URL = origUrl;
        } else {
          delete process.env.WEB_APP_URL;
        }
      }
    });
  });
});
