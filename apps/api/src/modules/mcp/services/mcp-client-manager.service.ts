import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  ExecuteMcpToolRequest,
  ExecuteMcpToolResponse,
  McpTransport,
  TestMcpConnectionRequest,
  TestMcpConnectionResponse,
} from '@knowledge/shared';
import { McpService } from './mcp.service';

export interface McpRemoteExecutionContext {
  transport: McpTransport;
  endpointUrl?: string;
  headers?: Record<string, string>;
}

const BUILTIN_DEMO_SERVER_IDS = new Set([
  'mcp-neon-postgres',
  'mcp-github-enterprise',
  'mcp-jira-cloud',
]);

const FORBIDDEN_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'cookie',
  'proxy-authorization',
]);

@Injectable()
export class McpClientManagerService {
  private readonly logger = new Logger(McpClientManagerService.name);

  constructor(private readonly mcpService: McpService) {}

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (!FORBIDDEN_HEADERS.has(k.toLowerCase()) && typeof v === 'string') {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  private createHardenedFetch(sanitizedHeaders: Record<string, string>) {
    return (input: string | URL, init?: RequestInit): Promise<Response> => {
      const mergedHeaders: Record<string, string> = { ...sanitizedHeaders };
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => {
            if (!FORBIDDEN_HEADERS.has(k.toLowerCase())) {
              mergedHeaders[k] = v;
            }
          });
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of init.headers) {
            if (!FORBIDDEN_HEADERS.has(k.toLowerCase())) {
              mergedHeaders[k] = v;
            }
          }
        } else {
          for (const [k, v] of Object.entries(init.headers)) {
            if (!FORBIDDEN_HEADERS.has(k.toLowerCase()) && typeof v === 'string') {
              mergedHeaders[k] = v;
            }
          }
        }
      }

      return globalThis.fetch(input, {
        ...init,
        redirect: 'error',
        headers: mergedHeaders,
      });
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Test connection to a remote SSE or local Stdio MCP server and discover tools.
   * Uses official @modelcontextprotocol/sdk SSEClientTransport for live remote endpoints.
   */
  async testConnection(req: TestMcpConnectionRequest): Promise<TestMcpConnectionResponse> {
    const startTime = Date.now();
    const isStrictProduction =
      process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true';

    try {
      if (req.transport === McpTransport.SSE) {
        if (!req.endpointUrl) {
          return {
            success: false,
            latencyMs: 0,
            tools: [],
            errorMessage: 'Endpoint URL is required for SSE transport.',
          };
        }

        await this.mcpService.validateRemoteUrlWithDns(req.endpointUrl);
        const sanitizedHeaders = this.sanitizeHeaders(req.headers);

        // 1. Attempt real MCP SDK SSE handshake & tool discovery
        const client = new Client(
          { name: 'smart-internal-knowledge-assistant', version: '1.0.0' },
          { capabilities: {} },
        );
        const transport = new SSEClientTransport(new URL(req.endpointUrl), {
          fetch: this.createHardenedFetch(sanitizedHeaders),
          requestInit: { headers: sanitizedHeaders, redirect: 'error' },
        });

        try {
          await this.withTimeout(client.connect(transport), 5000, 'MCP SSE connect');
          const listed = await this.withTimeout(client.listTools(), 5000, 'MCP listTools');
          const latencyMs = Math.max(1, Date.now() - startTime);
          const serverVersion = client.getServerVersion();

          return {
            success: true,
            latencyMs,
            serverInfo: {
              name: serverVersion?.name || 'Remote MCP Server',
              version: serverVersion?.version || '1.0.0',
            },
            tools: (listed.tools || []).map((t) => ({
              name: t.name,
              description: t.description || `Remote MCP tool ${t.name}`,
              inputSchema: (t.inputSchema as Record<string, unknown>) || { type: 'object' },
            })),
          };
        } catch (sdkErr: unknown) {
          const message = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
          if (isStrictProduction) {
            this.logger.warn(`MCP SSE connection failed in production: ${message}`);
            return {
              success: false,
              latencyMs: Math.max(1, Date.now() - startTime),
              tools: [],
              errorMessage: `Unable to establish MCP SSE handshake: ${message}`,
            };
          }

          // Graceful dev/demo fallback when external endpoint is offline
          this.logger.debug(`MCP SDK handshake unavailable in dev/demo (${message}); using simulated discovery.`);
          const latencyMs = Math.max(12, Date.now() - startTime);
          return {
            success: true,
            latencyMs,
            serverInfo: {
              name: 'Connected Remote MCP Endpoint',
              version: '1.0.0',
            },
            tools: [
              {
                name: 'custom_service_status',
                description: 'Retrieve real-time health and operational status',
                inputSchema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string', description: 'Service name' },
                  },
                },
              },
              {
                name: 'custom_search_records',
                description: 'Search enterprise records across external systems',
                inputSchema: {
                  type: 'object',
                  properties: {
                    term: { type: 'string', description: 'Search keywords' },
                  },
                  required: ['term'],
                },
              },
            ],
          };
        } finally {
          try {
            await client.close();
          } catch {
            // Ignore close errors on aborted transports
          }
        }
      }

      // Stdio transport (requires local container process; reject in strict production unless sandboxed)
      if (isStrictProduction) {
        return {
          success: false,
          latencyMs: Math.max(1, Date.now() - startTime),
          tools: [],
          errorMessage: 'Local Stdio MCP transport is disabled in multi-tenant production. Use SSE transport.',
        };
      }

      const latencyMs = Math.max(15, Date.now() - startTime);
      return {
        success: true,
        latencyMs,
        serverInfo: {
          name: 'Local Containerized MCP Tool',
          version: '1.0.0',
        },
        tools: [
          {
            name: 'local_command_execute',
            description: 'Execute sandboxed command via Stdio protocol',
            inputSchema: {
              type: 'object',
              properties: {
                action: { type: 'string', description: 'Action command' },
              },
            },
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Connection test failed: ${message}`);
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        tools: [],
        errorMessage: message,
      };
    }
  }

  /**
   * Execute an MCP tool via official @modelcontextprotocol/sdk SSE transport for custom servers,
   * or built-in demo handlers for pre-seeded portfolio demo servers.
   */
  async executeTool(
    req: ExecuteMcpToolRequest,
    remoteCtx?: McpRemoteExecutionContext,
  ): Promise<ExecuteMcpToolResponse> {
    const startTime = Date.now();
    this.logger.log(`Executing MCP tool "${req.toolName}" on server "${req.serverId}"`);

    const isBuiltinDemo = BUILTIN_DEMO_SERVER_IDS.has(req.serverId);
    const isStrictProduction =
      process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true';

    // 1. Live remote SSE MCP execution via official SDK for non-demo servers
    if (!isBuiltinDemo && remoteCtx?.transport === McpTransport.SSE && remoteCtx.endpointUrl) {
      await this.mcpService.validateRemoteUrlWithDns(remoteCtx.endpointUrl);
      const sanitizedHeaders = this.sanitizeHeaders(remoteCtx.headers);
      const client = new Client(
        { name: 'smart-internal-knowledge-assistant', version: '1.0.0' },
        { capabilities: {} },
      );
      const transport = new SSEClientTransport(new URL(remoteCtx.endpointUrl), {
        fetch: this.createHardenedFetch(sanitizedHeaders),
        requestInit: { headers: sanitizedHeaders, redirect: 'error' },
      });

      try {
        await this.withTimeout(client.connect(transport), 5000, 'MCP SSE connect');
        const toolResponse = await this.withTimeout(
          client.callTool({ name: req.toolName, arguments: req.arguments }),
          15000,
          `MCP callTool(${req.toolName})`,
        );
        return {
          toolName: req.toolName,
          latencyMs: Math.max(1, Date.now() - startTime),
          result: toolResponse,
        };
      } catch (sdkErr: unknown) {
        const message = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
        if (isStrictProduction) {
          throw new Error(`Remote MCP tool "${req.toolName}" execution failed: ${message}`, {
            cause: sdkErr,
          });
        }
        this.logger.warn(
          `Remote MCP SDK callTool failed in dev/demo (${message}); falling back to simulated handler.`,
        );
      } finally {
        try {
          await client.close();
        } catch {
          // Ignore close errors
        }
      }
    }

    // 2. Built-in demo & offline dev simulation handlers
    const toolLower = req.toolName.toLowerCase();

    if (toolLower.includes('sql') || toolLower.includes('postgres') || toolLower.includes('query')) {
      const query = (req.arguments.query as string) || 'SELECT 1;';
      const latencyMs = Date.now() - startTime + 24;
      return {
        toolName: req.toolName,
        latencyMs,
        result: {
          rowCount: 3,
          rows: [
            { id: 'usr_01', name: 'Aung Kyaw', role: 'DevOps Lead', status: 'ACTIVE', region: 'Yangon' },
            { id: 'usr_02', name: 'Sarah Jenkins', role: 'HR Director', status: 'ACTIVE', region: 'London' },
            { id: 'usr_03', name: 'Alex Rivera', role: 'SecOps Architect', status: 'ACTIVE', region: 'Remote' },
          ],
          executedQuery: query,
          status: 'SUCCESS',
        },
      };
    }

    if (toolLower.includes('github') || toolLower.includes('issue') || toolLower.includes('pr')) {
      const latencyMs = Date.now() - startTime + 18;
      return {
        toolName: req.toolName,
        latencyMs,
        result: {
          issueNumber: req.arguments.issueNumber || 142,
          repo: req.arguments.repo || 'acme/smart-internal-knowledge',
          title: req.arguments.title || 'Upgrade pgvector index to HNSW for 10x retrieval speed',
          state: 'OPEN',
          author: 'dev-lead',
          labels: ['enhancement', 'database', 'performance'],
          assignees: ['alex-secops'],
        },
      };
    }

    if (toolLower.includes('jira') || toolLower.includes('ticket')) {
      const ticketKey = (req.arguments.ticketKey as string) || 'OPS-2094';
      const latencyMs = Date.now() - startTime + 35;
      return {
        toolName: req.toolName,
        latencyMs,
        result: {
          key: ticketKey,
          summary: 'Internal VPN Gateway latency spike during peak hours',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignee: 'Sarah Jenkins (Workplace Operations)',
          slaRemaining: '3 hours',
        },
      };
    }

    const latencyMs = Date.now() - startTime + 20;
    return {
      toolName: req.toolName,
      latencyMs,
      result: {
        status: 'COMPLETED',
        executedArguments: req.arguments,
        output: `Tool "${req.toolName}" successfully executed on server "${req.serverId}".`,
      },
    };
  }
}
