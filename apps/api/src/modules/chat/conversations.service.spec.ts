import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext, UserRole } from '@knowledge/shared';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let mockPrisma: any;

  const tenant: TenantContext = {
    organizationId: 'org-conv-1',
    userId: 'user-01',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@company.com',
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        conversation: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        chatMessageRecord: {
          createMany: vi.fn(),
        },
      },
    };

    service = new ConversationsService(mockPrisma as PrismaService);
  });

  it('should list conversations scoped to tenant and user', async () => {
    mockPrisma.client.conversation.findMany.mockResolvedValue([
      {
        id: 'conv-101',
        title: 'VPN Setup & WireGuard',
        userId: 'user-01',
        organizationId: 'org-conv-1',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-01-01T10:05:00Z'),
        _count: { messages: 4 },
      },
    ]);

    const result = await service.listConversations(tenant);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('VPN Setup & WireGuard');
    expect(result[0].messageCount).toBe(4);
    expect(mockPrisma.client.conversation.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-conv-1',
        userId: 'user-01',
      },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  });

  it('should get conversation with hydrated message records', async () => {
    mockPrisma.client.conversation.findFirst.mockResolvedValue({
      id: 'conv-101',
      title: 'VPN Setup & WireGuard',
      userId: 'user-01',
      organizationId: 'org-conv-1',
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:05:00Z'),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'How do I connect to VPN?',
          citations: null,
          queryLogId: null,
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Install WireGuard and use SSO.',
          citations: [{ chunkId: 'c1', documentTitle: 'VPN Guide' }],
          queryLogId: 'log-1',
          createdAt: new Date('2026-01-01T10:00:05Z'),
        },
      ],
    });

    const result = await service.getConversation(tenant, 'conv-101');
    expect(result.id).toBe('conv-101');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].role).toBe('assistant');
    expect(result.messages[1].citations).toBeDefined();
  });

  it('should throw NotFoundException when conversation does not exist', async () => {
    mockPrisma.client.conversation.findFirst.mockResolvedValue(null);
    await expect(service.getConversation(tenant, 'non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ForbiddenException when member attempts to access another user thread', async () => {
    mockPrisma.client.conversation.findFirst.mockResolvedValue({
      id: 'conv-other',
      userId: 'user-99-other',
      organizationId: 'org-conv-1',
      messages: [],
    });

    await expect(service.getConversation(tenant, 'conv-other')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should create new conversation with auto-generated title when no conversationId provided', async () => {
    mockPrisma.client.conversation.create.mockResolvedValue({
      id: 'new-conv-uuid',
      title: 'How do I reset my database password?',
    });

    const convId = await service.saveTurn(
      tenant,
      undefined,
      'How do I reset my database password?',
      'Follow the instructions in the internal security portal.',
      [{ chunkId: 'c1', documentId: 'd1', documentTitle: 'DB Guide', snippet: '...', relevanceScore: 0.9, source: 'FILE_UPLOAD' as any }],
      'log-99',
    );

    expect(convId).toBe('new-conv-uuid');
    expect(mockPrisma.client.conversation.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-conv-1',
        userId: 'user-01',
        title: 'How do I reset my database password?',
      },
    });
    expect(mockPrisma.client.chatMessageRecord.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'How do I reset my database password?' }),
        expect.objectContaining({ role: 'assistant', queryLogId: 'log-99' }),
      ]),
    });
  });
});
