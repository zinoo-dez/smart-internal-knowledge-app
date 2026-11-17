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

export interface AnalyticsSummaryResponse {
  totalQueries: number;
  totalDocuments: number;
  totalTokensUsed: number;
  satisfactionRate: number; // percentage
  topQueries: { query: string; count: number }[];
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
