import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@knowledge/shared';

describe('RolesGuard (Security & Privilege Escalation Audit)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(tenantContext: unknown): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ tenantContext }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are specified on route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ userRole: UserRole.MEMBER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role matches required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({ userRole: UserRole.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should BLOCK vertical privilege escalation when MEMBER attempts ADMIN route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({ userRole: UserRole.MEMBER });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should BLOCK unauthenticated request when tenantContext is missing', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
