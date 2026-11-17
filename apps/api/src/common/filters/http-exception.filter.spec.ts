import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptionsFilter } from './http-exception.filter';

describe('GlobalExceptionsFilter', () => {
  let filter: GlobalExceptionsFilter;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionsFilter();
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    const mockResponse = {
      status: mockStatus,
    };
    const mockRequest = {
      method: 'GET',
      url: '/api/documents/non-existent',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format standard HttpException responses correctly', () => {
    const exception = new NotFoundException('Document not found');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/api/documents/non-existent',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should sanitize internal 500 server errors in production to avoid leaking database internals', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const exception = new Error('FATAL: password authentication failed for user "postgres"');
      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: { message: 'An unexpected internal server error occurred' },
        }),
      );
      // Ensure raw database password error string is NOT exposed in response
      const jsonCallArg = mockJson.mock.calls[0][0];
      expect(JSON.stringify(jsonCallArg)).not.toContain('password authentication failed');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
