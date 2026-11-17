import {
  AnalyticsSummaryResponse,
  ConnectorStatusResponse,
  ConversationDetail,
  ConversationSummary,
  CreateTicketParams,
  Department,
  DocumentSource,
  DocumentSummary,
  FeedbackType,
  IngestDocumentRequest,
  IngestDocumentResponse,
  NotionSyncRequest,
  SlackWebhookPayload,
  TicketStatus,
} from '@knowledge/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-mock-user-id': 'dev-admin-01',
  'x-mock-org-id': 'mock-org-default',
  'x-mock-role': 'ADMIN',
  'x-mock-email': 'admin@company.internal',
};

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
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
    ];
  }
}

export async function createDocument(
  data: IngestDocumentRequest,
): Promise<IngestDocumentResponse> {
  const res = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
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

  const res = await fetch(`${API_BASE_URL}/api/documents/upload/file`, {
    method: 'POST',
    headers: {
      'x-mock-user-id': 'dev-admin-01',
      'x-mock-org-id': 'mock-org-default',
      'x-mock-role': 'ADMIN',
      'x-mock-email': 'admin@company.internal',
    },
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: HTTP ${res.status}`);
  return await res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: 'DELETE',
    headers: DEFAULT_HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
}

export async function fetchAnalytics(): Promise<AnalyticsSummaryResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/feedback/analytics/summary`, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using initial analytics seed:', err);
    return {
      totalQueries: 142,
      totalDocuments: 8,
      totalTokensUsed: 38450,
      satisfactionRate: 94,
      topQueries: [
        { query: 'How to connect to company VPN?', count: 38 },
        { query: 'What is our annual leave policy?', count: 24 },
        { query: 'AWS credentials setup', count: 18 },
        { query: 'Dental insurance coverage', count: 12 },
      ],
    };
  }
}

export async function submitFeedback(
  queryLogId: string,
  feedbackType: FeedbackType,
  comment?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ queryLogId, feedbackType, comment }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function createSupportTicket(
  params: CreateTicketParams,
): Promise<{ ticketId: string; status: TicketStatus; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/chat/tools/ticket`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchConnectorStatus(): Promise<ConnectorStatusResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/connectors/status`, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
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
  const res = await fetch(`${API_BASE_URL}/api/connectors/notion/sync`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function sendSlackWebhook(
  data: SlackWebhookPayload,
): Promise<{ ok: boolean; documentId?: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/connectors/slack/webhook`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
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
  const res = await fetch(`${API_BASE_URL}/api/chat/conversations/${id}`, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function deleteConversation(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: DEFAULT_HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}
