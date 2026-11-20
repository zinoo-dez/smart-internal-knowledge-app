import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ExecuteMcpToolResponse,
  McpServerSummary,
  McpToolSummary,
  TenantContext,
  TestMcpConnectionResponse,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentTenant } from '../auth/decorators/tenant-context.decorator';
import { McpService } from './services/mcp.service';
import { McpClientManagerService } from './services/mcp-client-manager.service';
import { CreateMcpServerDto } from './dto/create-mcp-server.dto';
import { TestMcpConnectionDto } from './dto/test-mcp-connection.dto';
import { ExecuteMcpToolDto } from './dto/execute-mcp-tool.dto';
import { ToggleMcpToolDto } from './dto/toggle-mcp-tool.dto';

@Controller('api/mcp')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly mcpClientManager: McpClientManagerService,
  ) {}

  @Get('servers')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  async listServers(@CurrentTenant() tenant: TenantContext): Promise<McpServerSummary[]> {
    return this.mcpService.listServers(tenant);
  }

  @Post('servers/test')
  @Roles(UserRole.ADMIN)
  async testConnection(@Body() dto: TestMcpConnectionDto): Promise<TestMcpConnectionResponse> {
    return this.mcpClientManager.testConnection(dto);
  }

  @Post('servers')
  @Roles(UserRole.ADMIN)
  async createServer(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateMcpServerDto,
  ): Promise<McpServerSummary> {
    // Run test connection to auto-discover initial tools
    const testResult = await this.mcpClientManager.testConnection({
      transport: dto.transport,
      endpointUrl: dto.endpointUrl,
      command: dto.command,
      headers: dto.headers,
    });

    return this.mcpService.createServer(tenant, dto, testResult.tools);
  }

  @Patch('servers/:id/tools/:toolId')
  @Roles(UserRole.ADMIN)
  async toggleTool(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') serverId: string,
    @Param('toolId') toolId: string,
    @Body() body: ToggleMcpToolDto,
  ): Promise<McpToolSummary> {
    return this.mcpService.toggleTool(tenant, serverId, toolId, body);
  }

  @Delete('servers/:id')
  @Roles(UserRole.ADMIN)
  async deleteServer(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') serverId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.mcpService.deleteServer(tenant, serverId);
  }

  @Post('execute')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  async executeTool(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ExecuteMcpToolDto,
  ): Promise<ExecuteMcpToolResponse> {
    // Enforce server ownership, tool enablement, and HITL requireApproval RBAC gate
    await this.mcpService.authorizeToolExecution(tenant, dto.serverId, dto.toolName);
    return this.mcpClientManager.executeTool(dto);
  }
}
