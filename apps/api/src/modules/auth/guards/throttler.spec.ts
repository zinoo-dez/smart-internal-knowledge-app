import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('ThrottlerGuard (Gateway Volumetric DDoS & Spam Defense)', () => {
  let guard: ThrottlerGuard;
  let mockStorage: any;
  let mockReflector: any;

  beforeEach(() => {
    mockStorage = {
      increment: vi.fn(),
    };
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    };

    // Instantiate ThrottlerGuard with mock storage options
    const options = [
      {
        ttl: 60000,
        limit: 100,
      },
    ];

    guard = new ThrottlerGuard(
      options as any,
      mockStorage as ThrottlerStorage,
      mockReflector as Reflector,
    );
  });

  it('should allow requests within the 100 requests per minute quota', async () => {
    mockStorage.increment.mockResolvedValue({
      totalHits: 45,
      timeToExpire: 30000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });

    const mockContext: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '192.168.1.100',
          headers: {},
        }),
        getResponse: () => ({
          header: vi.fn(),
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    const canActivate = await guard.canActivate(mockContext);
    expect(canActivate).toBe(true);
    expect(mockStorage.increment).toHaveBeenCalledWith(
      expect.any(String),
      60000,
      100,
      60000,
      'default',
    );
  });

  it('should block requests and throw ThrottlerException when quota is exceeded', async () => {
    mockStorage.increment.mockResolvedValue({
      totalHits: 101,
      timeToExpire: 15000,
      isBlocked: true,
      timeToBlockExpire: 15000,
    });

    const mockContext: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '203.0.113.42',
          headers: {},
        }),
        getResponse: () => ({
          header: vi.fn(),
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await expect(guard.canActivate(mockContext)).rejects.toThrow();
  });
});
