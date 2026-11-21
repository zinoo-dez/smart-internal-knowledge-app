import {
  ClearanceLevel,
  Department,
  DocumentSource,
  FeedbackType,
  IngestionStatus,
  McpStatus,
  McpTransport,
  ModelComplexityTier,
  TicketStatus,
  UserRole,
} from './enums';

// Auth & Tenant Context
export interface TenantContext {
  organizationId: string;
  userId: string;
  userRole: UserRole;
  userEmail: string;
  department?: Department;
  matterIds?: string[]; // Legal matter IDs authorized for user
  deniedMatterIds?: string[]; // Ethical walls blocked matters
  clearanceLevel?: ClearanceLevel;
}

export interface DemoSessionResponse {
  token: string;
  expiresAt: string;
  organizationId: string;
  userId: string;
  userRole: UserRole;
}

// Ingestion Contracts
export interface IngestDocumentRequest {
  title: string;
  source: DocumentSource;
  department?: Department;
  sourceUrl?: string;
  content?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestDocumentResponse {
  documentId: string;
  status: IngestionStatus;
  jobId: string;
  message: string;
}

export interface DocumentSummary {
  id: string;
  organizationId: string;
  title: string;
  source: DocumentSource;
  department: Department;
  sourceUrl?: string;
  status: IngestionStatus;
  chunkCount: number;
  isStale?: boolean;
  lastSyncAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// Retrieval & Citations
export interface DocumentCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  source: DocumentSource;
  sourceUrl?: string;
  snippet: string;
  relevanceScore: number;
}

export interface SearchQueryRequest {
  query: string;
  topK?: number;
  minScore?: number;
  sourceFilter?: DocumentSource[];
}

export interface SearchQueryResponse {
  citations: DocumentCitation[];
}

// Chat & Tool Calling Contracts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  modelProvider?: string;
  modelName?: string;
  conversationId?: string;
  mode?: 'chat' | 'tools' | 'research';
  thinkingLevel?: 'normal' | 'deep';
}

export interface CreateTicketParams {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'IT' | 'HR' | 'OPS';
}

export interface TeamContactResult {
  name: string;
  role: string;
  department: string;
  email: string;
  slackHandle: string;
}

// Feedback & Analytics Contracts
export interface FeedbackSubmissionRequest {
  queryLogId: string;
  feedbackType: FeedbackType;
  comment?: string;
}

export interface SemanticCacheStats {
  hits: number;
  misses: number;
  hitRate: number; // percentage 0-100
  cachedQueriesCount: number;
  estimatedCostSavingsUsd: number;
}

export interface AnalyticsSummaryResponse {
  totalQueries: number;
  totalDocuments: number;
  totalTokensUsed: number;
  satisfactionRate: number; // percentage
  faithfulnessScore?: number; // percentage 0-100 (Grounding Index)
  topQueries: { query: string; count: number }[];
  cacheStats?: SemanticCacheStats;
}

// Connector Contracts
export interface NotionSyncRequest {
  databaseId?: string;
  pageTitle?: string;
  content?: string;
  department?: Department;
}

export interface ConfluenceSyncRequest {
  spaceKey?: string;
  pageTitle?: string;
  content?: string;
  department?: Department;
}

export interface SlackWebhookPayload {
  type?: string;
  challenge?: string;
  channel?: string;
  text?: string;
  user?: string;
  department?: Department;
}

export interface ConnectorScheduleStatus {
  enabled: boolean;
  cronSchedule: string; // e.g. "0 2 * * *" (Daily at 2:00 AM)
  lastRunAt?: string;
  nextRunAt?: string;
  staleDocumentsCount: number;
}

export interface ConnectorStatusResponse {
  notion: {
    status: 'CONNECTED' | 'DISCONNECTED';
    lastSync?: string;
    syncedPagesCount: number;
  };
  confluence?: {
    status: 'CONNECTED' | 'DISCONNECTED';
    lastSync?: string;
    syncedPagesCount: number;
  };
  slack: {
    status: 'CONNECTED' | 'DISCONNECTED';
    lastSync?: string;
    channelName?: string;
    syncedMessagesCount: number;
  };
  schedule?: ConnectorScheduleStatus;
}

// Conversation Thread Contracts
export interface ConversationSummary {
  id: string;
  title: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface ConversationMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: DocumentCitation[];
  queryLogId?: string;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessageItem[];
}

// Knowledge Gap & Unanswered Queries Contracts
export interface KnowledgeGapItem {
  id: string;
  query: string;
  category: string;
  frequency: number;
  userEmail: string;
  createdAt: string;
  status: 'UNRESOLVED' | 'RESOLVED';
  assignedTo?: string;
  resolutionNote?: string;
}

export interface KnowledgeGapSummaryResponse {
  totalGaps: number;
  topCategories: { category: string; count: number }[];
  gaps: KnowledgeGapItem[];
}

export interface ResolveGapRequest {
  resolutionNote: string;
}

export interface AssignGapRequest {
  assignedTo: string;
}

// Audit Log & Compliance Contracts
export interface AuditLogItem {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface QueryAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AuditLogSummaryCounts {
  piiRedactions: number;
  documentOperations: number;
  governanceActions: number;
}

export interface PaginatedAuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: AuditLogSummaryCounts;
}

// Slack Event & Interactive Bot Contracts
export interface SlackEventPayload {
  token?: string;
  team_id?: string;
  api_app_id?: string;
  type?: string; // 'url_verification' | 'event_callback'
  challenge?: string;
  event?: {
    type: string; // 'app_mention' | 'message'
    user: string;
    text: string;
    ts: string;
    channel: string;
    event_ts?: string;
    thread_ts?: string;
    bot_id?: string;
    subtype?: string;
  };
  event_id?: string;
  event_time?: number;
}

export interface SlackBlockKitMessage {
  channel: string;
  thread_ts?: string;
  text: string;
  blocks: Array<Record<string, unknown>>;
}

// Model Context Protocol (MCP) Contracts
export interface McpToolSummary {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  isEnabled: boolean;
  requireApproval: boolean;
  createdAt: string;
}

export interface McpServerSummary {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  transport: McpTransport;
  endpointUrl?: string;
  command?: string;
  status: McpStatus;
  latencyMs?: number;
  lastPingAt?: string;
  errorMessage?: string;
  tools: McpToolSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMcpServerRequest {
  name: string;
  description?: string;
  transport: McpTransport;
  endpointUrl?: string;
  command?: string;
  headers?: Record<string, string>;
  envSecrets?: Record<string, string>;
}

export interface UpdateMcpServerRequest {
  name?: string;
  description?: string;
  endpointUrl?: string;
  command?: string;
  status?: McpStatus;
  headers?: Record<string, string>;
  envSecrets?: Record<string, string>;
}

export interface TestMcpConnectionRequest {
  transport: McpTransport;
  endpointUrl?: string;
  command?: string;
  headers?: Record<string, string>;
}

export interface TestMcpConnectionResponse {
  success: boolean;
  latencyMs: number;
  serverInfo?: {
    name?: string;
    version?: string;
  };
  tools: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>;
  errorMessage?: string;
}

export interface ExecuteMcpToolRequest {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ExecuteMcpToolResponse {
  toolName: string;
  result: unknown;
  isError?: boolean;
  latencyMs: number;
}

export interface ToolExecutionStreamEvent {
  type: 'tool_start' | 'tool_result' | 'tool_approval_required';
  toolName: string;
  serverName?: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
  actionId?: string;
  latencyMs?: number;
  message?: string;
}


