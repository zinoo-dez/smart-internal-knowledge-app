import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { AuthService } from '../auth.service';
import { UserRole } from '@knowledge/shared';

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;
  let authService: Partial<AuthService>;

  beforeEach(() => {
    authService = {
      resolveTenantContext: vi.fn().mockResolvedValue({
        organizationId: 'org-uuid-1',
        userId: 'user-uuid-1',
        userRole: UserRole.MEMBER,
        userEmail: 'employee@company.internal',
      }),
    };
    guard = new ClerkAuthGuard(authService as AuthService);
  });

  function createMockContext(headers: Record<string, string>): ExecutionContext {
    const request = { headers, tenantContext: null };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  it('should reject requests missing Authorization header', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject requests with invalid token format', async () => {
    const context = createMockContext({ authorization: 'Basic 12345' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should accept valid mock development credentials and attach tenantContext', async () => {
    const context = createMockContext({
      'x-mock-user-id': 'clerk-user-99',
      'x-mock-org-id': 'clerk-org-77',
      'x-mock-role': UserRole.ADMIN,
    });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.tenantContext).toBeDefined();
    expect(req.tenantContext.organizationId).toBe('org-uuid-1');
  });
});
