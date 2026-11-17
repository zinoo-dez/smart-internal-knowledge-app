import { Injectable, Logger } from '@nestjs/common';
import {
  CreateTicketParams,
  DocumentCitation,
  TeamContactResult,
  TenantContext,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { HybridSearchService } from '../../search/hybrid-search.service';

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hybridSearchService: HybridSearchService,
  ) {}

  async searchKnowledgeBase(
    tenant: TenantContext,
    query: string,
    topK: number = 4,
  ): Promise<DocumentCitation[]> {
    this.logger.log(`Tool searchKnowledgeBase invoked: "${query}" (Org: ${tenant.organizationId})`);
    const searchResponse = await this.hybridSearchService.search(tenant, {
      query,
      topK,
      minScore: 0.01,
    });
    return searchResponse.citations;
  }

  async createInternalTicket(
    tenant: TenantContext,
    params: CreateTicketParams,
  ): Promise<{ ticketId: string; status: TicketStatus; message: string }> {
    this.logger.log(`Tool createInternalTicket invoked: "${params.title}" (Org: ${tenant.organizationId})`);
    const ticket = await this.prisma.client.supportTicket.create({
      data: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        title: params.title,
        description: params.description,
        priority: params.priority as any,
        category: params.category as any,
        status: TicketStatus.OPEN as any,
      },
    });

    return {
      ticketId: ticket.id,
      status: TicketStatus.OPEN,
      message: `Support ticket #${ticket.id.slice(0, 8)} successfully created under ${params.category}. Our team will review it.`,
    };
  }

  async lookupTeamContact(
    departmentOrTopic: string,
  ): Promise<TeamContactResult> {
    const topicLower = departmentOrTopic.toLowerCase();
    if (
      topicLower.includes('hr') ||
      topicLower.includes('leave') ||
      topicLower.includes('benefit') ||
      topicLower.includes('salary') ||
      topicLower.includes('ခွင့်') ||
      topicLower.includes('လစာ') ||
      topicLower.includes('ကျန်းမာရေး')
    ) {
      return {
        name: 'Sarah Jenkins',
        role: 'Head of People & HR Operations',
        department: 'Human Resources',
        email: 'hr-support@company.internal',
        slackHandle: '@sarah-hr',
      };
    }

    if (
      topicLower.includes('security') ||
      topicLower.includes('vpn') ||
      topicLower.includes('credential') ||
      topicLower.includes('access') ||
      topicLower.includes('လုံခြုံရေး') ||
      topicLower.includes('စကားဝှက်') ||
      topicLower.includes('ချိတ်')
    ) {
      return {
        name: 'Alex Rivera',
        role: 'Principal Security & DevOps Engineer',
        department: 'Information Security & IT',
        email: 'it-security@company.internal',
        slackHandle: '@alex-secops',
      };
    }

    return {
      name: 'IT Helpdesk Team',
      role: 'Internal Workplace Support Desk',
      department: 'Corporate IT',
      email: 'helpdesk@company.internal',
      slackHandle: '@it-helpdesk',
    };
  }
}
