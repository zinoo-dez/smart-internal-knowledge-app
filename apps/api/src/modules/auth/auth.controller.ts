import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DemoSessionResponse, TenantContext } from '@knowledge/shared';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { CurrentTenant } from './decorators/tenant-context.decorator';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('demo-session')
  createDemoSession(): DemoSessionResponse {
    return this.authService.issueDemoSessionToken();
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  getMe(@CurrentTenant() tenant: TenantContext): TenantContext {
    return tenant;
  }
}
