import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { McpTransport, TenantContext, UserRole } from '@knowledge/shared';
import { McpService } from './mcp.service';
import { McpClientManagerService } from './mcp-client-manager.service';

describe('McpService & McpClientManagerService', () => {
  let mcpService: McpService;
  let clientManager: McpClientManagerService;

  const mockTenant: TenantContext = {
    organizationId: 'org-test-42',
    userId: 'user-test-01',
    userRole: UserRole.ADMIN,
    userEmail: 'admin@acme.test',
  };

  const mockPrisma: any = {
    client: {
      mcpServer: {
        findMany: () => Promise.resolve([]),
        findFirst: () => Promise.resolve(null),
        create: () => Promise.reject(new Error('DB Offline')),
        delete: () => Promise.reject(new Error('DB Offline')),
      },
      mcpTool: {
        update: () => Promise.reject(new Error('DB Offline')),
      },
    },
  };

  beforeEach(() => {
    mcpService = new McpService(mockPrisma);
    clientManager = new McpClientManagerService(mcpService);
  });

  describe('AES-256-GCM Secret Encryption & Decryption', () => {
    it('should encrypt sensitive tokens and decrypt them back to exact original payload', () => {
      const secrets = {
        Authorization: 'Bearer secret_super_token_99',
        'x-api-key': 'neon_sec_abc123',
      };

      const encrypted = mcpService.encryptSecrets(secrets);
      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(':'); // iv:tag:ciphertext

      const decrypted = mcpService.decryptSecrets(encrypted);
      expect(decrypted).toEqual(secrets);
    });

    it('should return empty object on malformed or empty ciphertext', () => {
      expect(mcpService.decryptSecrets(null)).toEqual({});
      expect(mcpService.decryptSecrets('')).toEqual({});
      expect(mcpService.decryptSecrets('invalid:payload')).toEqual({});
    });
  });

  describe('SSRF Protection Guardrails', () => {
    it('should reject cloud metadata service endpoints in all environments', () => {
      expect(() => {
        mcpService.validateRemoteUrl('http://169.254.169.254/latest/meta-data/');
      }).toThrow(ForbiddenException);

      expect(() => {
        mcpService.validateRemoteUrl('http://metadata.google.internal/computeMetadata/v1/');
      }).toThrow(ForbiddenException);
    });

    it('should block non-HTTP/HTTPS protocols', () => {
      expect(() => {
        mcpService.validateRemoteUrl('file:///etc/passwd');
      }).toThrow(BadRequestException);

      expect(() => {
        mcpService.validateRemoteUrl('ftp://ftp.example.com');
      }).toThrow(BadRequestException);
    });

    it('should block private and loopback IP addresses in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        expect(() => {
          mcpService.validateRemoteUrl('http://localhost:8080/sse');
        }).toThrow(ForbiddenException);

        expect(() => {
          mcpService.validateRemoteUrl('http://127.0.0.1:4000/sse');
        }).toThrow(ForbiddenException);

        expect(() => {
          mcpService.validateRemoteUrl('http://10.0.0.15/mcp');
        }).toThrow(ForbiddenException);

        expect(() => {
          mcpService.validateRemoteUrl('http://192.168.1.50:8000/sse');
        }).toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should permit valid public HTTPS endpoints', () => {
      expect(() => {
        mcpService.validateRemoteUrl('https://mcp.neon.tech/sse');
      }).not.toThrow();

      expect(() => {
        mcpService.validateRemoteUrl('https://api.github.com/mcp');
      }).not.toThrow();
    });
  });

  describe('Server Management & Tool Toggles', () => {
    it('should register a custom MCP server and initialize discovered tools', async () => {
      const newServer = await mcpService.createServer(
        mockTenant,
        {
          name: 'Custom HR Workflow Server',
          description: 'Internal employee status queries',
          transport: McpTransport.SSE,
          endpointUrl: 'https://hr-mcp.internal.acme.com/sse',
          headers: { Authorization: 'Bearer token_hr' },
        },
        [
          {
            name: 'get_employee_leave_balance',
            description: 'Fetch remaining annual leave days',
            inputSchema: { type: 'object', properties: { employeeId: { type: 'string' } } },
          },
          {
            name: 'delete_employee_record',
            description: 'Purge employee profile',
            inputSchema: { type: 'object', properties: { employeeId: { type: 'string' } } },
          },
        ],
      );

      expect(newServer.id).toBeDefined();
      expect(newServer.name).toBe('Custom HR Workflow Server');
      expect(newServer.tools.length).toBe(2);

      // Verify mutating tool has requireApproval set to true
      const deleteTool = newServer.tools.find((t) => t.name === 'delete_employee_record');
      expect(deleteTool?.requireApproval).toBe(true);

      const readTool = newServer.tools.find((t) => t.name === 'get_employee_leave_balance');
      expect(readTool?.requireApproval).toBe(false);
    });

    it('should toggle tool enablement and requireApproval status', async () => {
      const servers = await mcpService.listServers(mockTenant);
      const neonServer = servers.find((s) => s.id === 'mcp-neon-postgres');
      expect(neonServer).toBeDefined();

      const tool = neonServer!.tools[0];
      expect(tool.isEnabled).toBe(true);

      const updated = await mcpService.toggleTool(mockTenant, neonServer!.id, tool.id, {
        isEnabled: false,
        requireApproval: true,
      });

      expect(updated.isEnabled).toBe(false);
      expect(updated.requireApproval).toBe(true);
    });

    it('should return active tools for tenant excluding disabled tools', async () => {
      const activeTools = await mcpService.getActiveToolsForTenant(mockTenant);
      expect(activeTools.length).toBeGreaterThan(0);
      expect(activeTools.every((t) => t.isEnabled)).toBe(true);
    });
  });

  describe('McpClientManager Tool Execution & Ping', () => {
    it('should test connection and discover tools from remote endpoint', async () => {
      const result = await clientManager.testConnection({
        transport: McpTransport.SSE,
        endpointUrl: 'https://mcp.example.com/sse',
        headers: { 'x-api-key': 'test' },
      });

      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should execute database tool and return structured query output', async () => {
      const execResult = await clientManager.executeTool({
        serverId: 'mcp-neon-postgres',
        toolName: 'postgres_run_query',
        arguments: { query: 'SELECT name, role FROM users WHERE region = "Yangon";' },
      });

      expect(execResult.toolName).toBe('postgres_run_query');
      expect(execResult.latencyMs).toBeGreaterThan(0);
      expect((execResult.result as any).status).toBe('SUCCESS');
      expect((execResult.result as any).rows.length).toBe(3);
    });

    it('should return success=false instead of simulated success for unreachable SSE endpoint in strict production', async () => {
      const origEnv = process.env.NODE_ENV;
      const origDemo = process.env.DEMO_AUTH_ENABLED;
      process.env.NODE_ENV = 'production';
      process.env.DEMO_AUTH_ENABLED = 'false';

      try {
        const result = await clientManager.testConnection({
          transport: McpTransport.SSE,
          endpointUrl: 'https://mcp.example.com/sse',
        });
        expect(result.success).toBe(false);
        expect(result.tools).toEqual([]);
        expect(result.errorMessage).toBeTruthy();
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origDemo === undefined) {
          delete process.env.DEMO_AUTH_ENABLED;
        } else {
          process.env.DEMO_AUTH_ENABLED = origDemo;
        }
      }
    });
  });
});
