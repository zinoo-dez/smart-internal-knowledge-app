import { describe, it, expect, vi } from 'vitest';
import { getTenantPrisma, TENANT_SCOPED_MODELS } from './tenant-prisma.extension';

describe('TenantPrismaExtension', () => {
  const mockOrgId = 'org-tenant-alpha';

  it('should throw an error if organizationId is empty', () => {
    const mockClient = { $extends: vi.fn() } as any;
    expect(() => getTenantPrisma(mockClient, '')).toThrowError(
      'TenantPrismaExtension requires a valid organizationId',
    );
  });

  it('should configure $extends with query interception on all models', () => {
    const mock$extends = vi.fn().mockReturnValue({ extended: true });
    const mockClient = { $extends: mock$extends } as any;

    const tenantClient = getTenantPrisma(mockClient, mockOrgId);

    expect(mock$extends).toHaveBeenCalled();
    expect(tenantClient).toEqual({ extended: true });
  });

  it('should intercept findMany query and inject organizationId into where clause', async () => {
    let interceptedQuery: any;
    const mockClient = {
      $extends: vi.fn().mockImplementation((config: any) => {
        interceptedQuery = config.query.$allModels.$allOperations;
        return { client: true };
      }),
    } as any;

    getTenantPrisma(mockClient, mockOrgId);
    expect(interceptedQuery).toBeDefined();

    const mockNextQuery = vi.fn().mockResolvedValue([{ id: 'doc-1' }]);
    const args = { where: { status: 'INDEXED' } };

    await interceptedQuery({
      model: 'Document',
      operation: 'findMany',
      args,
      query: mockNextQuery,
    });

    expect(args.where).toEqual({
      status: 'INDEXED',
      organizationId: mockOrgId,
    });
    expect(mockNextQuery).toHaveBeenCalledWith(args);
  });

  it('should intercept create and inject organizationId into data', async () => {
    let interceptedQuery: any;
    const mockClient = {
      $extends: vi.fn().mockImplementation((config: any) => {
        interceptedQuery = config.query.$allModels.$allOperations;
        return { client: true };
      }),
    } as any;

    getTenantPrisma(mockClient, mockOrgId);

    const mockNextQuery = vi.fn().mockResolvedValue({ id: 'doc-new' });
    const args = { data: { title: 'New Doc', department: 'HR' } };

    await interceptedQuery({
      model: 'Document',
      operation: 'create',
      args,
      query: mockNextQuery,
    });

    expect(args.data).toEqual({
      title: 'New Doc',
      department: 'HR',
      organizationId: mockOrgId,
    });
  });

  it('should not mutate non-tenant models', async () => {
    let interceptedQuery: any;
    const mockClient = {
      $extends: vi.fn().mockImplementation((config: any) => {
        interceptedQuery = config.query.$allModels.$allOperations;
        return { client: true };
      }),
    } as any;

    getTenantPrisma(mockClient, mockOrgId);

    const mockNextQuery = vi.fn().mockResolvedValue([]);
    const args = { where: { key: 'global-setting' } };

    await interceptedQuery({
      model: 'SystemConfig',
      operation: 'findMany',
      args,
      query: mockNextQuery,
    });

    expect(args.where).toEqual({ key: 'global-setting' });
  });

  it('should include McpServer in TENANT_SCOPED_MODELS and inject organizationId', async () => {
    expect(TENANT_SCOPED_MODELS).toContain('McpServer');

    let interceptedQuery: any;
    const mockClient = {
      $extends: vi.fn().mockImplementation((config: any) => {
        interceptedQuery = config.query.$allModels.$allOperations;
        return { client: true };
      }),
    } as any;

    getTenantPrisma(mockClient, mockOrgId);

    const mockNextQuery = vi.fn().mockResolvedValue([]);
    const args = { where: { status: 'CONNECTED' } };

    await interceptedQuery({
      model: 'McpServer',
      operation: 'findMany',
      args,
      query: mockNextQuery,
    });

    expect(args.where).toEqual({
      status: 'CONNECTED',
      organizationId: mockOrgId,
    });
  });

  it('should NOT include ChatMessageRecord (lacks organizationId column) and should guard findUnique/update/delete', async () => {
    expect(TENANT_SCOPED_MODELS).not.toContain('ChatMessageRecord');

    let interceptedQuery: any;
    const mockClient = {
      $extends: vi.fn().mockImplementation((config: any) => {
        interceptedQuery = config.query.$allModels.$allOperations;
        return { client: true };
      }),
    } as any;

    getTenantPrisma(mockClient, mockOrgId);

    for (const operation of ['findUnique', 'update', 'delete']) {
      const mockNextQuery = vi.fn().mockResolvedValue({ id: 'doc-1' });
      const args = { where: { id: 'doc-1' } };
      await interceptedQuery({
        model: 'Document',
        operation,
        args,
        query: mockNextQuery,
      });
      expect(args.where).toEqual({ id: 'doc-1', organizationId: mockOrgId });
    }
  });
});
