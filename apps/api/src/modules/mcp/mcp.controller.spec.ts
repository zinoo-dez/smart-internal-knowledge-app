import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExecuteMcpToolResponse,
  McpServerSummary,
  McpStatus,
  McpToolSummary,
  McpTransport,
  TenantContext,
  TestMcpConnectionResponse,
  UserRole,
} from '@knowledge/shared';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { McpController } from './mcp.controller';
import { McpService } from './services/mcp.service';
import { McpClientManagerService } from './services/mcp-client-manager.service';
import { CreateMcpServerDto } from './dto/create-mcp-server.dto';
import { ExecuteMcpToolDto } from './dto/execute-mcp-tool.dto';

describe('McpController - 4-Layer Feature Test Suite', () => {
  let controller: McpController;
  let mockMcpService: {
    listServers: ReturnType<typeof vi.fn>;
    findServer: ReturnType<typeof vi.fn>;
    createServer: ReturnType<typeof vi.fn>;
    toggleTool: ReturnType<typeof vi.fn>;
    deleteServer: ReturnType<typeof vi.fn>;
    authorizeToolExecution: ReturnType<typeof vi.fn>;
  };
  let mockMcpClientManager: {
    testConnection: ReturnType<typeof vi.fn>;
    executeTool: ReturnType<typeof vi.fn>;
  };

  const adminTenant: TenantContext = {
    organizationId: 'org-tenant-corp',
    userId: 'admin-user-01',
    userRole: UserRole.ADMIN,
    userEmail: 'admin@corp.com',
  };

  const memberTenant: TenantContext = {
    organizationId: 'org-tenant-corp',
    userId: 'member-user-02',
    userRole: UserRole.MEMBER,
    userEmail: 'dev@corp.com',
  };

  const sampleTool: McpToolSummary = {
    id: 'tool-sql-01',
    serverId: 'server-neon-01',
    name: 'run_sql',
    description: 'Execute read-only SQL queries on the replica',
    inputSchema: { type: 'object', properties: { sql: { type: 'string' } } },
    isEnabled: true,
    requireApproval: false,
    createdAt: '2026-11-20T00:00:00.000Z',
  };

  const sampleServer: McpServerSummary = {
    id: 'server-neon-01',
    organizationId: 'org-tenant-corp',
    name: 'Neon Postgres Hub',
    transport: McpTransport.SSE,
    endpointUrl: 'https://mcp.neon.tech/sse',
    command: undefined,
    status: McpStatus.CONNECTED,
    tools: [sampleTool],
    createdAt: '2026-11-20T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
  };

  beforeEach(() => {
    mockMcpService = {
      listServers: vi.fn(),
      findServer: vi.fn(),
      createServer: vi.fn(),
      toggleTool: vi.fn(),
      deleteServer: vi.fn(),
      authorizeToolExecution: vi.fn(),
    };

    mockMcpClientManager = {
      testConnection: vi.fn(),
      executeTool: vi.fn(),
    };

    controller = new McpController(
      mockMcpService as unknown as McpService,
      mockMcpClientManager as unknown as McpClientManagerService,
    );
  });

  // ==========================================
  // Layer 1: Unit Tests (Fast & Isolated)
  // ==========================================
  describe('Layer 1: Unit Tests (CRUD & Connection Testing)', () => {
    it('lists MCP servers scoped to tenant context', async () => {
      mockMcpService.listServers.mockResolvedValueOnce([sampleServer]);

      const result = await controller.listServers(adminTenant);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Neon Postgres Hub');
      expect(mockMcpService.listServers).toHaveBeenCalledWith(adminTenant);
    });

    it('tests remote connection before saving server', async () => {
      const testResult: TestMcpConnectionResponse = {
        success: true,
        latencyMs: 85,
        tools: [sampleTool],
      };
      mockMcpClientManager.testConnection.mockResolvedValueOnce(testResult);

      const testDto = {
        transport: McpTransport.SSE,
        endpointUrl: 'https://mcp.neon.tech/sse',
      };

      const result = await controller.testConnection(testDto);

      expect(result.success).toBe(true);
      expect(result.tools).toHaveLength(1);
      expect(mockMcpClientManager.testConnection).toHaveBeenCalledWith(testDto);
    });

    it('creates server and auto-discovers initial tools via client manager', async () => {
      const testResult: TestMcpConnectionResponse = {
        success: true,
        latencyMs: 90,
        tools: [sampleTool],
      };
      mockMcpClientManager.testConnection.mockResolvedValueOnce(testResult);
      mockMcpService.createServer.mockResolvedValueOnce(sampleServer);

      const createDto: CreateMcpServerDto = {
        name: 'Neon Postgres Hub',
        transport: McpTransport.SSE,
        endpointUrl: 'https://mcp.neon.tech/sse',
      };

      const created = await controller.createServer(adminTenant, createDto);

      expect(created).toEqual(sampleServer);
      expect(mockMcpClientManager.testConnection).toHaveBeenCalledWith({
        transport: createDto.transport,
        endpointUrl: createDto.endpointUrl,
        command: undefined,
        headers: undefined,
      });
      expect(mockMcpService.createServer).toHaveBeenCalledWith(adminTenant, createDto, testResult.tools);
    });

    it('toggles tool enablement and approval gates', async () => {
      const updatedTool: McpToolSummary = {
        ...sampleTool,
        isEnabled: false,
      };
      mockMcpService.toggleTool.mockResolvedValueOnce(updatedTool);

      const result = await controller.toggleTool(adminTenant, 'server-neon-01', 'tool-sql-01', {
        isEnabled: false,
      });

      expect(result.isEnabled).toBe(false);
      expect(mockMcpService.toggleTool).toHaveBeenCalledWith(
        adminTenant,
        'server-neon-01',
        'tool-sql-01',
        { isEnabled: false },
      );
    });

    it('deletes server with tenant ownership verification', async () => {
      mockMcpService.deleteServer.mockResolvedValueOnce({
        success: true,
        message: 'MCP server disconnected and deleted successfully',
      });

      const res = await controller.deleteServer(adminTenant, 'server-neon-01');

      expect(res.success).toBe(true);
      expect(mockMcpService.deleteServer).toHaveBeenCalledWith(adminTenant, 'server-neon-01');
    });
  });

  // ==========================================
  // Layer 2: Feature / Integration Flow (executeTool)
  // ==========================================
  describe('Layer 2: Tool Execution Flow & Order of Operations', () => {
    it('executes tool only after authorizing tenant ownership and tool permissions', async () => {
      const executionResult: ExecuteMcpToolResponse = {
        toolName: 'run_sql',
        result: { status: 'active', rowCount: 1 },
        isError: false,
        latencyMs: 120,
      };

      mockMcpService.authorizeToolExecution.mockResolvedValueOnce(undefined);
      mockMcpService.findServer.mockResolvedValueOnce(sampleServer);
      mockMcpClientManager.executeTool.mockResolvedValueOnce(executionResult);

      const dto: ExecuteMcpToolDto = {
        serverId: 'server-neon-01',
        toolName: 'run_sql',
        arguments: { sql: 'SELECT 1;' },
      };

      const result = await controller.executeTool(memberTenant, dto);

      expect(result).toEqual(executionResult);

      // Verify exact sequence
      expect(mockMcpService.authorizeToolExecution).toHaveBeenCalledWith(
        memberTenant,
        dto.serverId,
        dto.toolName,
      );
      expect(mockMcpService.findServer).toHaveBeenCalledWith(memberTenant, dto.serverId);
      expect(mockMcpClientManager.executeTool).toHaveBeenCalledWith(dto, {
        transport: sampleServer.transport,
        endpointUrl: sampleServer.endpointUrl,
      });
    });
  });

  // ==========================================
  // Layer 3: Authorization & Security Cases
  // ==========================================
  describe('Layer 3: Security, RBAC & Rate-Limiting Controls', () => {
    it('attaches ClerkAuthGuard and RolesGuard at controller class level', () => {
      const guards = Reflect.getMetadata('__guards__', McpController);
      expect(guards).toBeDefined();
      expect(guards).toContain(ClerkAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('enforces RBAC restrictions on sensitive admin actions', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.testConnection)).toEqual([UserRole.ADMIN]);
      expect(Reflect.getMetadata(ROLES_KEY, controller.createServer)).toEqual([UserRole.ADMIN]);
      expect(Reflect.getMetadata(ROLES_KEY, controller.toggleTool)).toEqual([UserRole.ADMIN]);
      expect(Reflect.getMetadata(ROLES_KEY, controller.deleteServer)).toEqual([UserRole.ADMIN]);
      expect(Reflect.getMetadata(ROLES_KEY, controller.listServers)).toEqual([
        UserRole.ADMIN,
        UserRole.MEMBER,
      ]);
      expect(Reflect.getMetadata(ROLES_KEY, controller.executeTool)).toEqual([
        UserRole.ADMIN,
        UserRole.MEMBER,
      ]);
    });

    it('enforces @Throttle rate limit metadata (30 req / 60s) on executeTool to prevent outbound socket exhaustion', () => {
      const throttlerLimit = Reflect.getMetadata('THROTTLER:LIMITdefault', controller.executeTool);
      const throttlerTtl = Reflect.getMetadata('THROTTLER:TTLdefault', controller.executeTool);

      expect(throttlerLimit).toBe(30);
      expect(throttlerTtl).toBe(60000);
    });
  });

  // ==========================================
  // Layer 4: Failure Modes & Regression Guards
  // ==========================================
  describe('Layer 4: Failure Modes & Gate Rejections', () => {
    it('aborts execution immediately if authorizeToolExecution fails (e.g. Forbidden/Disabled)', async () => {
      mockMcpService.authorizeToolExecution.mockRejectedValueOnce(
        new Error('Tool requires admin approval or is disabled'),
      );

      const dto: ExecuteMcpToolDto = {
        serverId: 'server-neon-01',
        toolName: 'run_sql',
        arguments: { sql: 'DROP TABLE users;' },
      };

      await expect(controller.executeTool(memberTenant, dto)).rejects.toThrow(
        'Tool requires admin approval or is disabled',
      );

      expect(mockMcpService.findServer).not.toHaveBeenCalled();
      expect(mockMcpClientManager.executeTool).not.toHaveBeenCalled();
    });

    it('handles remote transport network failures gracefully', async () => {
      mockMcpService.authorizeToolExecution.mockResolvedValueOnce(undefined);
      mockMcpService.findServer.mockResolvedValueOnce(sampleServer);
      mockMcpClientManager.executeTool.mockRejectedValueOnce(
        new Error('Upstream MCP SSE socket closed prematurely'),
      );

      const dto: ExecuteMcpToolDto = {
        serverId: 'server-neon-01',
        toolName: 'run_sql',
        arguments: {},
      };

      await expect(controller.executeTool(memberTenant, dto)).rejects.toThrow(
        'Upstream MCP SSE socket closed prematurely',
      );
    });
  });
});
