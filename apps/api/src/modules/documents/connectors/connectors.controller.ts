import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectorStatusResponse,
  NotionSyncRequest,
  SlackWebhookPayload,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../auth/decorators/tenant-context.decorator';
import { NotionConnector, NotionSyncResult } from './notion.connector';
import { SlackConnector, SlackWebhookResult } from './slack.connector';

@Controller('api/connectors')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ConnectorsController {
  constructor(
    private readonly notionConnector: NotionConnector,
    private readonly slackConnector: SlackConnector,
  ) {}

  @Get('status')
  async getStatus(): Promise<ConnectorStatusResponse> {
    return {
      notion: this.notionConnector.getStatus(),
      slack: this.slackConnector.getStatus(),
    };
  }

  @Post('notion/sync')
  @Roles(UserRole.ADMIN)
  async syncNotion(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: NotionSyncRequest,
  ): Promise<NotionSyncResult> {
    return this.notionConnector.syncPage(tenant, dto);
  }

  @Post('slack/webhook')
  async handleSlackWebhook(
    @CurrentTenant() tenant: TenantContext,
    @Body() payload: SlackWebhookPayload,
  ): Promise<SlackWebhookResult> {
    return this.slackConnector.handleWebhook(tenant, payload);
  }
}
