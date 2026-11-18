import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  SUBSCRIPTION_TIERS,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { BillingService } from './billing.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

@Controller('api/billing')
@UseGuards(ClerkAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('usage')
  async getUsage(@CurrentTenant() tenant: TenantContext) {
    return this.billingService.getTenantUsage(tenant);
  }

  @Get('tiers')
  getTiers() {
    return SUBSCRIPTION_TIERS;
  }

  @Post('upgrade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async upgrade(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    return this.billingService.upgradeSubscription(tenant, dto.tier);
  }
}
