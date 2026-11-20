import { PrismaClient } from '@knowledge/database';

/**
 * Tenant-scoped models that own an explicit organizationId column
 * and require strict tenant boundary enforcement.
 * Note: ChatMessageRecord is scoped transitively via Conversation.organizationId.
 */
export const TENANT_SCOPED_MODELS = [
  'Document',
  'DocumentChunk',
  'QueryLog',
  'Feedback',
  'SupportTicket',
  'AuditLog',
  'Conversation',
  'User',
  'McpServer',
];

/**
 * Creates a tenant-isolated Prisma client extension enforcing organizationId
 * on reads, unique lookups, mutations, and bulk operations to prevent IDOR and cross-tenant leakage.
 */
export function getTenantPrisma(client: PrismaClient, organizationId: string) {
  if (!organizationId) {
    throw new Error('TenantPrismaExtension requires a valid organizationId');
  }

  return client.$extends({
    name: `tenant-prisma-${organizationId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (model && TENANT_SCOPED_MODELS.includes(model)) {
            // Read, Search & Unique Lookups
            if (
              [
                'findMany',
                'findFirst',
                'findFirstOrThrow',
                'findUnique',
                'findUniqueOrThrow',
                'count',
                'aggregate',
                'groupBy',
              ].includes(operation)
            ) {
              args.where = { ...(args.where || {}), organizationId };
            }

            // Create Operations
            if (operation === 'create' && args.data) {
              args.data = { ...args.data, organizationId };
            }

            if (operation === 'createMany' && args.data) {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item: any) => ({ ...item, organizationId }));
              } else {
                args.data = { ...args.data, organizationId };
              }
            }

            if (operation === 'upsert') {
              args.where = { ...(args.where || {}), organizationId };
              if (args.create) {
                args.create = { ...args.create, organizationId };
              }
            }

            // Update & Delete Operations (single & bulk)
            if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              args.where = { ...(args.where || {}), organizationId };
            }
          }

          return query(args);
        },
      },
    },
  });
}
