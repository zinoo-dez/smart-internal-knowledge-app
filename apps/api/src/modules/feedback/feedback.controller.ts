import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AnalyticsSummaryResponse,
  KnowledgeGapSummaryResponse,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { AssignGapDto, ResolveGapDto } from './dto/knowledge-gap.dto';

@Controller('api/feedback')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<{ success: boolean; feedbackId: string }> {
    return this.feedbackService.submitFeedback(tenant, dto);
  }

  @Get('analytics/summary')
  @Roles(UserRole.ADMIN)
  async getAnalyticsSummary(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<AnalyticsSummaryResponse> {
    return this.feedbackService.getAnalyticsSummary(tenant);
  }

  @Get('analytics/logs')
  @Roles(UserRole.ADMIN)
  async getRecentLogs(
    @CurrentTenant() tenant: TenantContext,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.feedbackService.getRecentQueryLogs(tenant, parsedLimit);
  }

  @Get('knowledge-gaps')
  @Roles(UserRole.ADMIN)
  async getKnowledgeGaps(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<KnowledgeGapSummaryResponse> {
    return this.feedbackService.getKnowledgeGaps(tenant);
  }

  @Post('knowledge-gaps/:id/resolve')
  @Roles(UserRole.ADMIN)
  async resolveKnowledgeGap(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: ResolveGapDto,
  ): Promise<{ success: boolean }> {
    return this.feedbackService.resolveKnowledgeGap(tenant, id, body.resolutionNote);
  }

  @Post('knowledge-gaps/:id/assign')
  @Roles(UserRole.ADMIN)
  async assignKnowledgeGap(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: AssignGapDto,
  ): Promise<{ success: boolean }> {
    return this.feedbackService.assignKnowledgeGap(tenant, id, body.assignedTo);
  }
}
