import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

export * from '@prisma/client';

let sharedPool: pg.Pool | null = null;
let sharedPrisma: PrismaClient | null = null;

export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString || process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX || 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/**
 * Lazy singleton Prisma accessor — avoids leaking a duplicate pg.Pool on import
 * when NestJS PrismaService instantiates its own managed client.
 */
export function getPrismaClient(): PrismaClient {
  if (!sharedPrisma) {
    const url = process.env.DATABASE_URL;
    sharedPool = new pg.Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX || 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(sharedPool);
    sharedPrisma = new PrismaClient({ adapter });
  }
  return sharedPrisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
