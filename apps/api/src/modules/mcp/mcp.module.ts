import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { McpService } from './services/mcp.service';
import { McpClientManagerService } from './services/mcp-client-manager.service';
import { McpController } from './mcp.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [McpService, McpClientManagerService],
  controllers: [McpController],
  exports: [McpService, McpClientManagerService],
})
export class McpModule {}
