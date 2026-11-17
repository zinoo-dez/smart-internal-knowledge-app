import {
  AnalyticsSummaryResponse,
  CreateTicketParams,
  DocumentSource,
  DocumentSummary,
  FeedbackType,
  IngestDocumentRequest,
  IngestDocumentResponse,
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
