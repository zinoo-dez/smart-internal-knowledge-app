import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectorStatusResponse,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../auth/decorators/tenant-context.decorator';
import { NotionConnector, NotionSyncResult } from './notion.connector';
import { ConfluenceConnector, ConfluenceSyncResult } from './confluence.connector';
import { SlackConnector, SlackWebhookResult } from './slack.connector';
import { SyncSchedulerService } from '../services/sync-scheduler.service';
import { ConfluenceSyncDto, NotionSyncDto, SlackWebhookDto } from '../dto/connectors.dto';

@Controller('api/connectors')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ConnectorsController {
  constructor(
    private readonly notionConnector: NotionConnector,
    private readonly confluenceConnector: ConfluenceConnector,
    private readonly slackConnector: SlackConnector,
    private readonly syncScheduler: SyncSchedulerService,
  ) {}

  @Get('status')
  async getStatus(@CurrentTenant() tenant: TenantContext): Promise<ConnectorStatusResponse> {
    const schedule = await this.syncScheduler.getScheduleStatus(tenant);
    return {
      notion: this.notionConnector.getStatus(),
      confluence: this.confluenceConnector.getStatus(),
      slack: this.slackConnector.getStatus(),
      schedule,
    };
  }

  @Post('schedule/run-now')
  @Roles(UserRole.ADMIN)
  async triggerScheduledSync(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<{ success: boolean; syncedCount: number; staleCount: number }> {
    return this.syncScheduler.runScheduledSync(tenant);
  }

  @Post('notion/sync')
  @Roles(UserRole.ADMIN)
  async syncNotion(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: NotionSyncDto,
  ): Promise<NotionSyncResult> {
    return this.notionConnector.syncPage(tenant, dto);
  }

  @Post('confluence/sync')
  @Roles(UserRole.ADMIN)
  async syncConfluence(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ConfluenceSyncDto,
  ): Promise<ConfluenceSyncResult> {
    return this.confluenceConnector.syncSpace(tenant, dto);
  }

  @Post('slack/webhook')
  @Roles(UserRole.ADMIN)
  async handleSlackWebhook(
    @CurrentTenant() tenant: TenantContext,
    @Body() payload: SlackWebhookDto,
  ): Promise<SlackWebhookResult> {
    return this.slackConnector.handleWebhook(tenant, payload);
  }
}
