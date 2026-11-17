import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationDetail,
  ConversationSummary,
  DocumentCitation,
  TenantContext,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listConversations(tenant: TenantContext): Promise<ConversationSummary[]> {
    const list = await this.prisma.client.conversation.findMany({
      where: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    });

    return list.map((c) => ({
      id: c.id,
      title: c.title,
      userId: c.userId,
      organizationId: c.organizationId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    }));
  }

  async getConversation(
    tenant: TenantContext,
    id: string,
  ): Promise<ConversationDetail> {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    // Ensure non-admin users only access their own conversations
    if (tenant.userRole !== 'ADMIN' && conversation.userId !== tenant.userId) {
      throw new ForbiddenException('Access denied to conversation');
    }

    return {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      organizationId: conversation.organizationId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation.messages.length,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        citations: (m.citations as unknown as DocumentCitation[]) || undefined,
        queryLogId: m.queryLogId ?? undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async deleteConversation(
    tenant: TenantContext,
    id: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    if (tenant.userRole !== 'ADMIN' && conversation.userId !== tenant.userId) {
      throw new ForbiddenException('Access denied to delete conversation');
    }

    await this.prisma.client.conversation.delete({
      where: { id },
    });

    return { success: true };
  }

  async saveTurn(
    tenant: TenantContext,
    conversationId: string | undefined,
    userQuery: string,
    assistantResponse: string,
    citations?: DocumentCitation[],
    queryLogId?: string,
  ): Promise<string> {
    let convId = conversationId;

    if (convId) {
      const existing = await this.prisma.client.conversation.findFirst({
        where: { id: convId, organizationId: tenant.organizationId },
      });
      if (!existing) {
        convId = undefined; // Create fresh if ID not found
      }
    }

    if (!convId) {
      // Derive clean title from first inquiry
      const cleanTitle =
        userQuery.trim().length > 40
          ? `${userQuery.trim().slice(0, 37)}...`
          : userQuery.trim() || 'New Conversation';

      const created = await this.prisma.client.conversation.create({
        data: {
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          title: cleanTitle,
        },
      });
      convId = created.id;
    } else {
      // Touch updatedAt
      await this.prisma.client.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });
    }

    // Persist user message and assistant message
    await this.prisma.client.chatMessageRecord.createMany({
      data: [
        {
          conversationId: convId,
          role: 'user',
          content: userQuery,
        },
        {
          conversationId: convId,
          role: 'assistant',
          content: assistantResponse,
          citations: citations ? JSON.parse(JSON.stringify(citations)) : undefined,
          queryLogId,
        },
      ],
    });

    return convId;
  }
}
