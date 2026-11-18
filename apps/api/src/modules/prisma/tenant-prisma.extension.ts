import { PrismaClient } from '@knowledge/database';

/**
 * Tenant-scoped models that require strict organizationId boundary enforcement.
 */
export const TENANT_SCOPED_MODELS = [
  'Document',
  'DocumentChunk',
  'QueryLog',
  'Feedback',
  'SupportTicket',
  'AuditLog',
  'Conversation',
  'ChatMessageRecord',
  'User',
];

/**
 * Creates a tenant-isolated Prisma client extension enforcing organizationId
 * on all reads, mutations, and bulk operations to prevent IDOR and cross-tenant leakage.
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
            // Read & Search Operations
            if (
              ['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(
                operation,
              )
            ) {
              args.where = { ...(args.where || {}), organizationId };
            }

            // Mutation Operations
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

            if (['updateMany', 'deleteMany'].includes(operation)) {
              args.where = { ...(args.where || {}), organizationId };
            }
          }

          return query(args);
        },
      },
    },
  });
}
