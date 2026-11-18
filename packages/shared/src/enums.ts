export enum Department {
  ALL = 'ALL',
  HR = 'HR',
  ENGINEERING = 'ENGINEERING',
  OPERATIONS = 'OPERATIONS',
  EXECUTIVE = 'EXECUTIVE',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum DocumentSource {
  FILE_UPLOAD = 'FILE_UPLOAD',
  NOTION = 'NOTION',
  SLACK = 'SLACK',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  CONFLUENCE = 'CONFLUENCE',
}

export enum IngestionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

export enum FeedbackType {
  THUMBS_UP = 'THUMBS_UP',
  THUMBS_DOWN = 'THUMBS_DOWN',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TicketCategory {
  IT = 'IT',
  HR = 'HR',
  OPS = 'OPS',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum AIModelProvider {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  CLAUDE = 'CLAUDE',
}

export enum AuditAction {
  DOCUMENT_INGESTED = 'DOCUMENT_INGESTED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  QUERY_EXECUTED = 'QUERY_EXECUTED',
  PII_FLAGGED = 'PII_FLAGGED',
  KNOWLEDGE_GAP_RESOLVED = 'KNOWLEDGE_GAP_RESOLVED',
  KNOWLEDGE_GAP_ASSIGNED = 'KNOWLEDGE_GAP_ASSIGNED',
  ACL_UPDATED = 'ACL_UPDATED',
}

export enum McpTransport {
  SSE = 'SSE',
  STDIO = 'STDIO',
}

export enum McpStatus {
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
  DEGRADED = 'DEGRADED',
}

export enum ClearanceLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
}

export enum ModelComplexityTier {
  FLASH = 'FLASH',
  REASONING = 'REASONING',
}

