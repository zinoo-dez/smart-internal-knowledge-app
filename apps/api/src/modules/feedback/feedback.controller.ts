import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AnalyticsSummaryResponse,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

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
}
