import {
  AnalyticsSummaryResponse,
  ConnectorStatusResponse,
  ConversationDetail,
  ConversationSummary,
  CreateTicketParams,
  DemoSessionResponse,
  Department,
  DocumentSource,
  DocumentSummary,
  FeedbackType,
  IngestDocumentRequest,
  IngestDocumentResponse,
  KnowledgeGapSummaryResponse,
  NotionSyncRequest,
  ConfluenceSyncRequest,
  PaginatedAuditLogsResponse,
  QueryAuditLogsParams,
  SlackWebhookPayload,
  TicketStatus,
  TenantUsageSummary,
  SubscriptionTier,
  CreateMcpServerRequest,
  McpServerSummary,
  McpStatus,
  McpToolSummary,
  McpTransport,
  TestMcpConnectionRequest,
  TestMcpConnectionResponse,
} from '@knowledge/shared';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEMO_TOKEN_STORAGE_KEY = 'knowledge_assistant_demo_session';

interface CachedDemoSession {
  token: string;
  expiresAtMs: number;
}

let cachedSession: CachedDemoSession | null = null;
let inflightSessionPromise: Promise<string | null> | null = null;

export function clearDemoSessionCache(): void {
  cachedSession = null;
  inflightSessionPromise = null;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(DEMO_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage access restrictions
    }
  }
}

export function isMixedContentBlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'https:' &&
    API_BASE_URL.startsWith('http:') &&
    !API_BASE_URL.startsWith('https:')
  );
}

async function fetchDemoSessionToken(): Promise<string | null> {
  if (isMixedContentBlocked()) return null;

  const now = Date.now();
  // 1. In-memory cache (refresh 60s before expiry)
  if (cachedSession && cachedSession.expiresAtMs - 60_000 > now) {
    return cachedSession.token;
  }

  // 2. sessionStorage cache
  if (typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(DEMO_TOKEN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedDemoSession;
        if (parsed.token && parsed.expiresAtMs - 60_000 > now) {
          cachedSession = parsed;
          return parsed.token;
        }
      }
    } catch {
      // Ignore malformed cache
    }
  }

  // 3. Deduplicate concurrent session fetches
  if (inflightSessionPromise) {
    return inflightSessionPromise;
  }

  inflightSessionPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/demo-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as DemoSessionResponse;
      if (!data?.token) return null;

      const session: CachedDemoSession = {
        token: data.token,
        expiresAtMs: new Date(data.expiresAt).getTime(),
      };
      cachedSession = session;

      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(DEMO_TOKEN_STORAGE_KEY, JSON.stringify(session));
        } catch {
          // Ignore storage quota errors
        }
      }
      return data.token;
    } catch {
      return null;
    } finally {
      inflightSessionPromise = null;
    }
  })();

  return inflightSessionPromise;
}

/**
 * Resolves Authorization headers using a server-issued signed Portfolio Demo Bearer token.
 * Never ships hardcoded x-mock-* admin headers in production requests.
 */
export async function getAuthHeaders(includeJsonContentType = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  const token = await fetchDemoSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticated fetch wrapper with single automatic retry on expired 401 session token.
 */
async function apiFetch(
  path: string,
  options: RequestInit = {},
  includeJsonContentType = true,
): Promise<Response> {
  if (isMixedContentBlocked()) {
    throw new Error('Mixed content: HTTPS page cannot fetch from HTTP API.');
  }

  const authHeaders = await getAuthHeaders(includeJsonContentType);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearDemoSessionCache();
    const refreshedHeaders = await getAuthHeaders(includeJsonContentType);
    if (refreshedHeaders['Authorization']) {
      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...refreshedHeaders,
          ...(options.headers || {}),
        },
      });
    }
  }

  return res;
}

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  try {
    const res = await apiFetch('/api/documents', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using initial demo seed:', err);
    return [
      {
        id: 'seed-doc-1',
        organizationId: 'mock-org-default',
        title: 'Company Remote Work & VPN Setup Handbook',
        source: DocumentSource.FILE_UPLOAD,
        department: Department.ALL,
        status: 'INDEXED' as any,
        chunkCount: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'seed-doc-2',
        organizationId: 'mock-org-default',
        title: 'Engineering Onboarding & AWS Architecture',
        source: DocumentSource.NOTION,
        department: Department.ENGINEERING,
        sourceUrl: 'https://notion.so/engineering/architecture',
        status: 'INDEXED' as any,
        chunkCount: 22,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'seed-doc-3',
        organizationId: 'mock-org-default',
        title: 'HR Employee Benefits & Health Insurance 2026',
        source: DocumentSource.GOOGLE_DRIVE,
        department: Department.HR,
        status: 'INDEXED' as any,
        chunkCount: 9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'seed-doc-4',
        organizationId: 'mock-org-default',
        title: 'Confluence Engineering Runbook & Incident Response',
        source: DocumentSource.CONFLUENCE,
        department: Department.ENGINEERING,
        sourceUrl: 'https://company.atlassian.net/wiki/spaces/ENG-WIKI',
        status: 'INDEXED' as any,
        chunkCount: 18,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

export async function createDocument(
  data: IngestDocumentRequest,
): Promise<IngestDocumentResponse> {
  const res = await apiFetch('/api/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function uploadDocumentFile(
  file: File,
  title?: string,
): Promise<IngestDocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);

  const res = await apiFetch(
    '/api/documents/upload/file',
    {
      method: 'POST',
      body: formData,
    },
    false,
  );
  if (!res.ok) throw new Error(`File upload failed: HTTP ${res.status}`);
  return await res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
}

export async function fetchAnalytics(): Promise<AnalyticsSummaryResponse> {
  try {
    const res = await apiFetch('/api/feedback/analytics/summary', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using initial analytics seed:', err);
    return {
      totalQueries: 142,
      totalDocuments: 8,
      totalTokensUsed: 38450,
      satisfactionRate: 94,
      faithfulnessScore: 98.4,
      topQueries: [
        { query: 'How to connect to company VPN?', count: 38 },
        { query: 'What is our annual leave policy?', count: 24 },
        { query: 'AWS credentials setup', count: 18 },
        { query: 'Dental insurance coverage', count: 12 },
      ],
      cacheStats: {
        hits: 42,
        misses: 25,
        hitRate: 62.7,
        cachedQueriesCount: 18,
        estimatedCostSavingsUsd: 0.84,
      },
    };
  }
}

export async function submitFeedback(
  queryLogId: string,
  feedbackType: FeedbackType,
  comment?: string,
): Promise<{ success: boolean }> {
  const res = await apiFetch('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ queryLogId, feedbackType, comment }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function createSupportTicket(
  params: CreateTicketParams,
): Promise<{ ticketId: string; status: TicketStatus; message: string }> {
  const res = await apiFetch('/api/chat/tools/ticket', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchConnectorStatus(): Promise<ConnectorStatusResponse> {
  try {
    const res = await apiFetch('/api/connectors/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend connectors status unavailable, using fallback:', err);
    return {
      notion: {
        status: 'CONNECTED',
        lastSync: new Date().toISOString(),
        syncedPagesCount: 4,
      },
      confluence: {
        status: 'CONNECTED',
        lastSync: new Date().toISOString(),
        syncedPagesCount: 8,
      },
      slack: {
        status: 'CONNECTED',
        lastSync: new Date().toISOString(),
        channelName: '#engineering-announcements',
        syncedMessagesCount: 12,
      },
    };
  }
}

export async function syncNotionPage(
  data: NotionSyncRequest,
): Promise<{ success: boolean; documentId: string; title: string; message: string }> {
  try {
    const res = await apiFetch('/api/connectors/notion/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend Notion sync unavailable, using mock sync fallback:', err);
    return {
      success: true,
      documentId: 'mock-notion-' + Date.now(),
      title: data.pageTitle || 'Notion Architecture & Coding Standards',
      message: 'Document accepted for ingestion (Mock Fallback Mode)',
    };
  }
}

export async function syncConfluenceSpace(
  data: ConfluenceSyncRequest,
): Promise<{ success: boolean; documentId: string; title: string; message: string }> {
  try {
    const res = await apiFetch('/api/connectors/confluence/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend Confluence sync unavailable, using mock sync fallback:', err);
    return {
      success: true,
      documentId: 'mock-confluence-' + Date.now(),
      title: data.pageTitle || 'Confluence Engineering Runbook & Incident Response',
      message: 'Space documentation accepted for ingestion (Mock Fallback Mode)',
    };
  }
}

export async function sendSlackWebhook(
  data: SlackWebhookPayload,
): Promise<{ ok: boolean; documentId?: string; message: string }> {
  const res = await apiFetch('/api/connectors/slack/webhook', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function triggerScheduledSync(): Promise<{
  success: boolean;
  syncedCount: number;
  staleCount: number;
}> {
  const res = await apiFetch('/api/connectors/schedule/run-now', { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await apiFetch('/api/chat/conversations', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend conversations unavailable, using fallback list:', err);
    return [
      {
        id: 'seed-thread-1',
        title: 'Company VPN & WireGuard Handbook',
        userId: 'dev-admin-01',
        organizationId: 'mock-org-default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 2,
      },
      {
        id: 'seed-thread-2',
        title: 'AWS Credentials & Microservices',
        userId: 'dev-admin-01',
        organizationId: 'mock-org-default',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        messageCount: 4,
      },
    ];
  }
}

export async function fetchConversationDetail(id: string): Promise<ConversationDetail> {
  const res = await apiFetch(`/api/chat/conversations/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function deleteConversation(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchKnowledgeGaps(): Promise<KnowledgeGapSummaryResponse> {
  try {
    const res = await apiFetch('/api/feedback/knowledge-gaps', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend gaps unavailable, using demo seed:', err);
    return {
      totalGaps: 3,
      topCategories: [
        { category: 'HR & Policies', count: 2 },
        { category: 'Engineering Architecture', count: 1 },
      ],
      gaps: [
        {
          id: 'gap-seed-1',
          query: 'What is our 2026 paternity leave duration and salary match?',
          category: 'HR & Policies',
          frequency: 5,
          userEmail: 'dev.lead@company.internal',
          createdAt: new Date().toISOString(),
          status: 'UNRESOLVED',
        },
        {
          id: 'gap-seed-2',
          query: 'How to request dedicated static IP in us-east-1 VPC?',
          category: 'Engineering Architecture',
          frequency: 3,
          userEmail: 'infra.eng@company.internal',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'UNRESOLVED',
          assignedTo: 'sarah.infra@company.internal',
        },
        {
          id: 'gap-seed-3',
          query: 'Can we expense personal broadband bills while traveling?',
          category: 'HR & Policies',
          frequency: 2,
          userEmail: 'contractor@company.internal',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          status: 'RESOLVED',
          resolutionNote: 'Clarified in remote work expense handbook section 4.',
        },
      ],
    };
  }
}

export async function resolveKnowledgeGap(
  gapId: string,
  resolutionNote: string,
): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/feedback/knowledge-gaps/${gapId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function assignKnowledgeGap(
  gapId: string,
  assignedTo: string,
): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/feedback/knowledge-gaps/${gapId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignedTo }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

// Audit Logs & Security Compliance
export async function fetchAuditLogs(
  params?: QueryAuditLogsParams,
): Promise<PaginatedAuditLogsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.action) query.set('action', params.action);
  if (params?.search) query.set('search', params.search);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  try {
    const res = await apiFetch(`/api/admin/audit-logs?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using initial demo audit logs:', err);
    return {
      items: [
        {
          id: 'mock-audit-1',
          organizationId: 'mock-org-default',
          userId: 'dev-admin-01',
          userEmail: 'admin@company.internal',
          userName: 'Security Administrator',
          action: 'DOCUMENT_INGESTED',
          resource: 'Document:seed-doc-1',
          details: { title: 'Company Remote Work & VPN Setup Handbook', department: 'ALL' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'mock-audit-2',
          organizationId: 'mock-org-default',
          userId: 'dev-admin-01',
          userEmail: 'admin@company.internal',
          userName: 'Security Administrator',
          action: 'PII_FLAGGED',
          resource: 'UserQueryPrompt',
          details: { sanitizedPatterns: ['AWS_ACCESS_KEY'] },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'mock-audit-3',
          organizationId: 'mock-org-default',
          userId: 'dev-admin-01',
          userEmail: 'admin@company.internal',
          userName: 'Security Administrator',
          action: 'KNOWLEDGE_GAP_RESOLVED',
          resource: 'QueryLog:log-201',
          details: { query: 'WireGuard setup steps', resolutionNote: 'Handbook updated' },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      total: 3,
      page: 1,
      limit: 25,
      totalPages: 1,
    };
  }
}

export function getExportAuditLogsUrl(params?: QueryAuditLogsParams): string {
  const query = new URLSearchParams();
  if (params?.action) query.set('action', params.action);
  if (params?.search) query.set('search', params.search);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  return `${API_BASE_URL}/api/admin/audit-logs/export?${query.toString()}`;
}

export async function fetchBillingUsage(): Promise<TenantUsageSummary> {
  try {
    const res = await apiFetch('/api/billing/usage', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend billing unavailable, using initial demo metrics:', err);
    return {
      organizationId: 'mock-org-default',
      tier: SubscriptionTier.PRO,
      currentPeriodStart: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString(),
      currentPeriodEnd: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).toISOString(),
      queryCount: 42,
      queryLimit: 2500,
      queryUsagePercent: 2,
      tokenCount: 68420,
      tokenLimit: 5000000,
      tokenUsagePercent: 1,
      documentCount: 4,
      documentLimit: 100,
      isQuotaExceeded: false,
    };
  }
}

export async function upgradeSubscription(
  tier: SubscriptionTier,
): Promise<{ success: boolean; message: string; tier: SubscriptionTier }> {
  const res = await apiFetch('/api/billing/upgrade', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

// MCP Hub & Connectors API
export async function fetchMcpServers(): Promise<McpServerSummary[]> {
  try {
    const res = await apiFetch('/api/mcp/servers', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend MCP unavailable, using initial demo mock servers:', err);
    return [
      {
        id: 'mcp-neon-postgres',
        organizationId: 'mock-org-default',
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
            description:
              'Execute parameterized read-only SQL queries on the internal PostgreSQL database.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
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
              properties: { tableName: { type: 'string' } },
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
        organizationId: 'mock-org-default',
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
              properties: { repo: { type: 'string' }, issueNumber: { type: 'number' } },
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
              properties: { repo: { type: 'string' }, title: { type: 'string' } },
            },
            isEnabled: true,
            requireApproval: true,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mcp-jira-service',
        organizationId: 'mock-org-default',
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
            inputSchema: { type: 'object', properties: { ticketKey: { type: 'string' } } },
            isEnabled: true,
            requireApproval: false,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

export async function testMcpConnection(
  dto: TestMcpConnectionRequest,
): Promise<TestMcpConnectionResponse> {
  try {
    const res = await apiFetch('/api/mcp/servers/test', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend test connection unavailable, using simulated discovery:', err);
    return {
      success: true,
      latencyMs: 38,
      serverInfo: { name: 'Remote MCP Server', version: '1.0.0' },
      tools: [
        {
          name: 'custom_query_data',
          description: 'Query remote dataset via custom MCP endpoint',
          inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
        },
        {
          name: 'custom_fetch_record',
          description: 'Fetch individual record by identifier',
          inputSchema: { type: 'object', properties: { recordId: { type: 'string' } } },
        },
      ],
    };
  }
}

export async function createMcpServer(dto: CreateMcpServerRequest): Promise<McpServerSummary> {
  const res = await apiFetch('/api/mcp/servers', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function toggleMcpTool(
  serverId: string,
  toolId: string,
  updates: { isEnabled?: boolean; requireApproval?: boolean },
): Promise<McpToolSummary> {
  const res = await apiFetch(`/api/mcp/servers/${serverId}/tools/${toolId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function deleteMcpServer(
  serverId: string,
): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}
