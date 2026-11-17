import { Department, DocumentSource, FeedbackType, IngestionStatus, TicketStatus, UserRole } from './enums';

// Auth & Tenant Context
export interface TenantContext {
  organizationId: string;
  userId: string;
  userRole: UserRole;
  userEmail: string;
  department?: Department;
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

export interface PaginatedAuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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


