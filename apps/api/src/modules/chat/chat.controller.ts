import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ConversationDetail,
  ConversationSummary,
  CreateTicketParams,
  TenantContext,
  TicketStatus,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { RagAgentService } from './rag-agent.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { ConversationsService } from './conversations.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';

@Controller('api/chat')
@UseGuards(ClerkAuthGuard)
export class ChatController {
  constructor(
    private readonly ragAgentService: RagAgentService,
    private readonly agentToolsService: AgentToolsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get('conversations')
  async listConversations(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ConversationSummary[]> {
    return this.conversationsService.listConversations(tenant);
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<ConversationDetail> {
    return this.conversationsService.getConversation(tenant, id);
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.conversationsService.deleteConversation(tenant, id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('stream')
  async streamChat(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ChatCompletionDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.ragAgentService.streamChat(tenant, dto, res);
  }

  @Post('tools/ticket')
  async createTicket(
    @CurrentTenant() tenant: TenantContext,
    @Body() params: CreateTicketParams,
  ): Promise<{ ticketId: string; status: TicketStatus; message: string }> {
    return this.agentToolsService.createInternalTicket(tenant, params);
  }
}
