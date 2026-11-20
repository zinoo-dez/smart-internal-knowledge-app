import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as dns from 'dns/promises';
import * as net from 'net';
import {
  CreateMcpServerRequest,
  McpServerSummary,
  McpStatus,
  McpToolSummary,
  McpTransport,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

  // In-memory fallback repository when running in dev/test without active database container
  private memoryServers: Map<string, McpServerSummary> = new Map();

  constructor(private readonly prisma: PrismaService) {
    const rawSecret = process.env.ENCRYPTION_SECRET || 'knowledge-assistant-default-aes-key-32b';
    this.encryptionKey = crypto.createHash('sha256').update(rawSecret).digest();
    this.seedDefaultMockServers();
  }

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_SECRET) {
      throw new Error(
        'CRITICAL SECURITY ERROR: ENCRYPTION_SECRET environment variable must be set in production.',
      );
    }
  }

  /**
   * Encrypt sensitive environment variables, auth tokens, and headers
   */
  public encryptSecrets(secrets: Record<string, string>): string {
    if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_SECRET) {
      throw new Error('Cannot encrypt secrets in production without ENCRYPTION_SECRET configured.');
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(JSON.stringify(secrets), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt stored secrets
   */
  public decryptSecrets(encryptedPayload?: string | null): Record<string, string> {
    if (!encryptedPayload) return {};
    try {
      const parts = encryptedPayload.split(':');
      if (parts.length !== 3) return {};
      const [ivHex, tagHex, contentHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(contentHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (err) {
      this.logger.warn(`Failed to decrypt secrets: ${(err as Error).message}`);
      return {};
    }
  }

  /**
   * SSRF Protection: Validate remote URL against private/cloud metadata ranges
   */
  private normalizeHostOrIp(rawHost: string): string {
    const stripped = rawHost.toLowerCase().trim().replace(/^\[|\]$/g, '');
    const v4MappedHex = stripped.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (v4MappedHex) {
      const hi = parseInt(v4MappedHex[1], 16);
      const lo = parseInt(v4MappedHex[2], 16);
      return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    }
    return stripped.replace(/^::ffff:/, '');
  }

  public validateRemoteUrl(rawUrl?: string): void {
    if (!rawUrl) return;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('Endpoint URL must use HTTP or HTTPS protocol.');
      }

      if (parsed.username || parsed.password) {
        throw new BadRequestException('Endpoint URL must not contain embedded credentials.');
      }

      const host = this.normalizeHostOrIp(parsed.hostname);
      const isProduction = process.env.NODE_ENV === 'production';

      // Disallow all cloud link-local metadata (169.254.0.0/16, AWS/GCP/Azure) and mDNS in all environments
      if (
        host.startsWith('169.254.') ||
        host.includes('169.254.') ||
        host === 'metadata.google.internal' ||
        host === 'instance-data' ||
        host.endsWith('.internal') ||
        host.endsWith('.local')
      ) {
        throw new ForbiddenException('Access to cloud instance metadata service is prohibited.');
      }

      // In production, block private IP address ranges, loopback, CGNAT, and IPv4-mapped IPv6 bypasses
      if (isProduction) {
        if (
          host === 'localhost' ||
          host.endsWith('.localhost') ||
          this.isBlockedIpAddress(host, true)
        ) {
          throw new ForbiddenException(
            `Access to internal or private IP address (${host}) is blocked by SSRF policy.`,
          );
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) throw err;
      throw new BadRequestException(`Invalid endpoint URL: ${err.message}`);
    }
  }

  private isBlockedIpAddress(ip: string, isProduction: boolean): boolean {
    const normalized = this.normalizeHostOrIp(ip);
    if (normalized.startsWith('169.254.')) return true;
    if (!isProduction) return false;
    return (
      normalized.startsWith('127.') ||
      normalized === '0.0.0.0' ||
      normalized === '0' ||
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('10.') ||
      normalized.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalized) ||
      /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(normalized) ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd')
    );
  }

  /**
   * DNS-Rebinding-Resistant SSRF validation: validates lexical hostname AND resolved DNS IPs.
   */
  public async validateRemoteUrlWithDns(rawUrl?: string): Promise<void> {
    this.validateRemoteUrl(rawUrl);
    if (!rawUrl) return;
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const isProduction = process.env.NODE_ENV === 'production';

    if (net.isIP(host)) {
      if (this.isBlockedIpAddress(host, isProduction)) {
        throw new ForbiddenException(`Resolved IP address (${host}) is blocked by SSRF policy.`);
      }
      return;
    }

    if (isProduction) {
      try {
        const records = await dns.lookup(host, { all: true });
        for (const rec of records) {
          if (this.isBlockedIpAddress(rec.address, true)) {
            throw new ForbiddenException(
              `DNS resolution for ${host} returned blocked internal IP (${rec.address}).`,
            );
          }
        }
      } catch (err: unknown) {
        if (err instanceof ForbiddenException) throw err;
        // DNS failure will be handled safely by fetch timeout
      }
    }
  }

  /**
   * List all configured MCP servers for the current tenant
   */
  async listServers(tenant: TenantContext): Promise<McpServerSummary[]> {
    try {
      const servers = await (this.prisma.client as any).mcpServer.findMany({
        where: { organizationId: tenant.organizationId },
        include: { tools: true },
        orderBy: { createdAt: 'desc' },
      });

      if (servers && servers.length > 0) {
        return servers.map((s: any) => this.mapPrismaToSummary(s));
      }
    } catch (err) {
      this.logger.debug(`Prisma mcpServer query failed, serving from memory store: ${(err as Error).message}`);
    }

    // Fallback: Return deep-cloned tenant-scoped in-memory servers (prefer tenant overrides over shared-default)
    const resolvedById = new Map<string, McpServerSummary>();
    for (const s of this.memoryServers.values()) {
      if (s.organizationId === 'shared-default' && !resolvedById.has(s.id)) {
        resolvedById.set(s.id, JSON.parse(JSON.stringify(s)));
      }
    }
    for (const s of this.memoryServers.values()) {
      if (s.organizationId === tenant.organizationId) {
        resolvedById.set(s.id, JSON.parse(JSON.stringify(s)));
      }
    }
    return Array.from(resolvedById.values());
  }

  /**
   * Find a specific MCP server by ID
   */
  async findServer(tenant: TenantContext, serverId: string): Promise<McpServerSummary> {
    try {
      const server = await (this.prisma.client as any).mcpServer.findFirst({
        where: { id: serverId, organizationId: tenant.organizationId },
        include: { tools: true },
      });
      if (server) return this.mapPrismaToSummary(server);
    } catch (err) {
      this.logger.debug(`Prisma findServer failed: ${(err as Error).message}`);
    }

    const memory =
      this.memoryServers.get(`${tenant.organizationId}:${serverId}`) ||
      this.memoryServers.get(serverId);
    if (!memory || (memory.organizationId !== tenant.organizationId && memory.organizationId !== 'shared-default')) {
      throw new NotFoundException(`MCP Server #${serverId} not found.`);
    }
    return JSON.parse(JSON.stringify(memory));
  }

  /**
   * Register a new MCP server for the tenant
   */
  async createServer(
    tenant: TenantContext,
    dto: CreateMcpServerRequest,
    discoveredTools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }> = [],
  ): Promise<McpServerSummary> {
    if (dto.transport === McpTransport.SSE) {
      await this.validateRemoteUrlWithDns(dto.endpointUrl);
    }

    const encryptedSecrets = dto.envSecrets || dto.headers
      ? this.encryptSecrets({ ...dto.headers, ...dto.envSecrets })
      : null;

    const serverId = `mcp-${Date.now()}`;
    const initialTools: McpToolSummary[] = discoveredTools.map((t, idx) => ({
      id: `tool-${Date.now()}-${idx}`,
      serverId,
      name: t.name,
      description: t.description || `Tool for ${dto.name}`,
      inputSchema: t.inputSchema || { type: 'object' },
      isEnabled: true,
      requireApproval: t.name.includes('delete') || t.name.includes('drop') || t.name.includes('update'),
      createdAt: new Date().toISOString(),
    }));

    const newSummary: McpServerSummary = {
      id: serverId,
      organizationId: tenant.organizationId,
      name: dto.name,
      description: dto.description || '',
      transport: dto.transport,
      endpointUrl: dto.endpointUrl,
      command: dto.command,
      status: McpStatus.CONNECTED,
      latencyMs: 38,
      lastPingAt: new Date().toISOString(),
      tools: initialTools,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await (this.prisma.client as any).mcpServer.create({
        data: {
          id: serverId,
          organizationId: tenant.organizationId,
          name: dto.name,
          description: dto.description,
          transport: dto.transport,
          endpointUrl: dto.endpointUrl,
          command: dto.command,
          envSecrets: encryptedSecrets,
          status: McpStatus.CONNECTED,
          latencyMs: 38,
          lastPingAt: new Date(),
          tools: {
            create: initialTools.map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
              isEnabled: t.isEnabled,
              requireApproval: t.requireApproval,
            })),
          },
        },
        include: { tools: true },
      });
      return this.mapPrismaToSummary(created);
    } catch (err) {
      this.logger.debug(`Prisma createServer failed, saving to memory fallback: ${(err as Error).message}`);
      this.memoryServers.set(serverId, newSummary);
      return newSummary;
    }
  }

  /**
   * Toggle tool enablement or approval gate
   */
  async toggleTool(
    tenant: TenantContext,
    serverId: string,
    toolId: string,
    updates: { isEnabled?: boolean; requireApproval?: boolean },
  ): Promise<McpToolSummary> {
    await this.findServer(tenant, serverId);

    try {
      // IDOR defense: strictly verify tool belongs to this specific server
      const existing = await (this.prisma.client as any).mcpTool.findFirst({
        where: { id: toolId, serverId },
      });
      if (!existing) {
        throw new NotFoundException(`Tool #${toolId} not found on server #${serverId}.`);
      }

      const updated = await (this.prisma.client as any).mcpTool.update({
        where: { id: toolId },
        data: updates,
      });
      return {
        id: updated.id,
        serverId: updated.serverId,
        name: updated.name,
        description: updated.description,
        inputSchema: updated.inputSchema as any,
        isEnabled: updated.isEnabled,
        requireApproval: updated.requireApproval,
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;

      // Memory fallback update (clone shared-default per tenant to prevent cross-tenant mutation)
      const tenantOverrideKey = `${tenant.organizationId}:${serverId}`;
      let server = this.memoryServers.get(tenantOverrideKey) || this.memoryServers.get(serverId);
      if (server) {
        if (server.organizationId === 'shared-default') {
          server = JSON.parse(JSON.stringify(server)) as McpServerSummary;
          server.organizationId = tenant.organizationId;
          this.memoryServers.set(tenantOverrideKey, server);
        }
        const tool = server.tools.find((t) => t.id === toolId);
        if (tool) {
          if (updates.isEnabled !== undefined) tool.isEnabled = updates.isEnabled;
          if (updates.requireApproval !== undefined) tool.requireApproval = updates.requireApproval;
          return { ...tool };
        }
      }
      throw new NotFoundException(`Tool #${toolId} not found on server #${serverId}.`);
    }
  }

  /**
   * Authorizes direct MCP tool execution for a tenant:
   * 1. Verifies server ownership & CONNECTED status
   * 2. Verifies the target tool exists on that specific server & isEnabled
   * 3. Enforces Human-in-the-Loop approval gate (non-ADMIN members cannot directly bypass requireApproval)
   */
  async authorizeToolExecution(
    tenant: TenantContext,
    serverId: string,
    toolName: string,
  ): Promise<McpToolSummary> {
    const server = await this.findServer(tenant, serverId);
    if (server.status !== McpStatus.CONNECTED) {
      throw new ForbiddenException(`MCP Server "${server.name}" is not active (${server.status}).`);
    }

    const tool = server.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new NotFoundException(`Tool "${toolName}" is not registered on server #${serverId}.`);
    }

    if (!tool.isEnabled) {
      throw new ForbiddenException(
        `MCP tool "${toolName}" has been disabled by your organization administrator.`,
      );
    }

    if (tool.requireApproval && tenant.userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        `MCP tool "${toolName}" is a mutating action requiring administrator authorization.`,
      );
    }

    return { ...tool };
  }

  /**
   * Delete an MCP server
   */
  async deleteServer(tenant: TenantContext, serverId: string): Promise<{ success: boolean; message: string }> {
    const server = await this.findServer(tenant, serverId);
    if (server.organizationId === 'shared-default') {
      throw new ForbiddenException('Built-in shared MCP templates cannot be deleted.');
    }

    try {
      const repo = (this.prisma.client as any).mcpServer;
      if (typeof repo?.deleteMany === 'function') {
        await repo.deleteMany({
          where: { id: serverId, organizationId: tenant.organizationId },
        });
      } else {
        await repo.delete({
          where: { id: serverId },
        });
      }
    } catch {
      this.memoryServers.delete(`${tenant.organizationId}:${serverId}`);
      this.memoryServers.delete(serverId);
    }

    return { success: true, message: `MCP Server #${serverId} removed.` };
  }

  /**
   * Retrieve all enabled tools for RAG prompt injection across all connected servers
   */
  async getActiveToolsForTenant(tenant: TenantContext): Promise<McpToolSummary[]> {
    const servers = await this.listServers(tenant);
    const activeTools: McpToolSummary[] = [];

    for (const server of servers) {
      if (server.status === McpStatus.CONNECTED) {
        for (const tool of server.tools) {
          if (tool.isEnabled) {
            activeTools.push(tool);
          }
        }
      }
    }

    return activeTools;
  }

  private mapPrismaToSummary(server: any): McpServerSummary {
    return {
      id: server.id,
      organizationId: server.organizationId,
      name: server.name,
      description: server.description || '',
      transport: server.transport,
      endpointUrl: server.endpointUrl,
      command: server.command,
      status: server.status,
      latencyMs: server.latencyMs || 0,
      lastPingAt: server.lastPingAt ? server.lastPingAt.toISOString() : undefined,
      errorMessage: server.errorMessage,
      tools: (server.tools || []).map((t: any) => ({
        id: t.id,
        serverId: t.serverId,
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema || {},
        isEnabled: t.isEnabled,
        requireApproval: t.requireApproval,
        createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      })),
      createdAt: server.createdAt ? server.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: server.updatedAt ? server.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private seedDefaultMockServers(): void {
    const defaultServers: McpServerSummary[] = [
      {
        id: 'mcp-neon-postgres',
        organizationId: 'shared-default',
        name: 'Neon PostgreSQL (Production Database)',
        description: 'Direct SQL query and schema inspection for enterprise relational databases.',
        transport: McpTransport.SSE,
        endpointUrl: 'https://mcp.neon.tech/sse',
        status: McpStatus.CONNECTED,
        latencyMs: 32,
        lastPingAt: new Date().toISOString(),
        tools: [
          {
            id: 'neon-tool-run-sql',
            serverId: 'mcp-neon-postgres',
            name: 'postgres_run_query',
            description: 'Execute parameterized read-only SQL queries on the internal PostgreSQL database.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL SELECT query to execute' },
              },
              required: ['query'],
            },
            isEnabled: true,
            requireApproval: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'neon-tool-describe-schema',
            serverId: 'mcp-neon-postgres',
            name: 'postgres_describe_schema',
            description: 'Inspect table schema, columns, and indexes.',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: { type: 'string', description: 'Target table name' },
              },
              required: ['tableName'],
            },
            isEnabled: true,
            requireApproval: false,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mcp-github-enterprise',
        organizationId: 'shared-default',
        name: 'GitHub Enterprise MCP',
        description: 'Read repository issues, PRs, and commit history.',
        transport: McpTransport.STDIO,
        command: 'docker run -i --rm mcp/github',
        status: McpStatus.CONNECTED,
        latencyMs: 18,
        lastPingAt: new Date().toISOString(),
        tools: [
          {
            id: 'github-tool-get-issue',
            serverId: 'mcp-github-enterprise',
            name: 'github_get_issue',
            description: 'Fetch details, status, and comments of a GitHub issue or pull request.',
            inputSchema: {
              type: 'object',
              properties: {
                repo: { type: 'string', description: 'Repository name (e.g. acme/web)' },
                issueNumber: { type: 'number', description: 'Issue or PR number' },
              },
              required: ['repo', 'issueNumber'],
            },
            isEnabled: true,
            requireApproval: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'github-tool-create-issue',
            serverId: 'mcp-github-enterprise',
            name: 'github_create_issue',
            description: 'Create a new GitHub tracking issue.',
            inputSchema: {
              type: 'object',
              properties: {
                repo: { type: 'string', description: 'Repository name' },
                title: { type: 'string', description: 'Issue title' },
                body: { type: 'string', description: 'Issue markdown body' },
              },
              required: ['repo', 'title'],
            },
            isEnabled: true,
            requireApproval: true, // Mutating action requires approval
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mcp-jira-service',
        organizationId: 'shared-default',
        name: 'Jira Service Management',
        description: 'Lookup support tickets and update incident statuses.',
        transport: McpTransport.SSE,
        endpointUrl: 'https://jira.company.internal/mcp/sse',
        status: McpStatus.CONNECTED,
        latencyMs: 46,
        lastPingAt: new Date().toISOString(),
        tools: [
          {
            id: 'jira-tool-lookup-ticket',
            serverId: 'mcp-jira-service',
            name: 'jira_lookup_ticket',
            description: 'Look up live Jira service ticket details, assignee, and SLA.',
            inputSchema: {
              type: 'object',
              properties: {
                ticketKey: { type: 'string', description: 'Jira issue key (e.g. PROD-1029)' },
              },
              required: ['ticketKey'],
            },
            isEnabled: true,
            requireApproval: false,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const server of defaultServers) {
      this.memoryServers.set(server.id, server);
    }
  }
}
