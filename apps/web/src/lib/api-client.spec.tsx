import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearDemoSessionCache, getAuthHeaders, submitFeedback } from './api-client';
import { FeedbackType } from '@knowledge/shared';

describe('API Client — Portfolio Demo Session Auth & 401 Retry', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearDemoSessionCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('requests a signed Bearer token from /api/auth/demo-session and never emits x-mock-* headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'demo.payload123.sig456',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        organizationId: 'mock-org-default',
        userId: 'dev-admin-01',
        userRole: 'ADMIN',
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const headers = await getAuthHeaders(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(headers['Authorization']).toBe('Bearer demo.payload123.sig456');
    expect(headers['x-mock-user-id']).toBeUndefined();
    expect(headers['x-mock-role']).toBeUndefined();

    // Subsequent call uses cached session token without refetching
    const cachedHeaders = await getAuthHeaders(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cachedHeaders['Authorization']).toBe('Bearer demo.payload123.sig456');
  });

  it('refreshes demo session token and retries once when API returns 401', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.endsWith('/api/auth/demo-session')) {
        return {
          ok: true,
          json: async () => ({
            token: `demo.token-${callCount}.sig`,
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            organizationId: 'mock-org-default',
            userId: 'dev-admin-01',
            userRole: 'ADMIN',
          }),
        };
      }
      if (callCount === 2) {
        return { ok: false, status: 401, json: async () => ({ message: 'Expired' }) };
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await submitFeedback('log-1', FeedbackType.THUMBS_UP);
    expect(res).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(4); // demo-session -> 401 -> demo-session refresh -> 200
  });
});
