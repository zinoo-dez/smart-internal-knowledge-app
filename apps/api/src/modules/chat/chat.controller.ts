import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateTicketParams, TenantContext, TicketStatus } from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { RagAgentService } from './rag-agent.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';

@Controller('api/chat')
@UseGuards(ClerkAuthGuard)
export class ChatController {
  constructor(
    private readonly ragAgentService: RagAgentService,
    private readonly agentToolsService: AgentToolsService,
  ) {}

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
