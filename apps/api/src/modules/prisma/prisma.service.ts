import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@knowledge/database';
import { getTenantPrisma } from './tenant-prisma.extension';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient;

  constructor() {
    this.client = createPrismaClient();
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  /**
   * Returns a tenant-scoped Prisma client that automatically injects
   * where: { organizationId } into all queries, preventing cross-tenant leakage.
   */
  forTenant(organizationId: string) {
    return getTenantPrisma(this.client, organizationId);
  }
}
