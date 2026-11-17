import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, ClerkAuthGuard, RolesGuard],
  exports: [AuthService, ClerkAuthGuard, RolesGuard],
})
export class AuthModule {}
