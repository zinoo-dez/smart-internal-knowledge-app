import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantContext } from '@knowledge/shared';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { CurrentTenant } from './decorators/tenant-context.decorator';

@Controller('api/auth')
@UseGuards(ClerkAuthGuard)
export class AuthController {
  @Get('me')
  getMe(@CurrentTenant() tenant: TenantContext): TenantContext {
    return tenant;
  }
}
