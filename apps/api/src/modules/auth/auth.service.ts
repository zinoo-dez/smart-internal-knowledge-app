import { Injectable, Logger } from '@nestjs/common';
import { TenantContext, UserRole } from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveTenantContext(params: {
    clerkUserId: string;
    clerkOrgId?: string;
    email: string;
    name?: string;
    role?: UserRole;
  }): Promise<TenantContext> {
    const orgId = params.clerkOrgId || `personal-${params.clerkUserId}`;
    const userRole = params.role || UserRole.MEMBER;

    // Ensure Organization exists
    const organization = await this.prisma.client.organization.upsert({
      where: { clerkOrgId: orgId },
      update: {},
      create: {
        clerkOrgId: orgId,
        name: params.clerkOrgId ? `Workspace ${orgId}` : `${params.name || params.email}'s Workspace`,
      },
    });

    // Ensure User exists and is linked to the Organization
    const user = await this.prisma.client.user.upsert({
      where: { clerkUserId: params.clerkUserId },
      update: {
        email: params.email,
        name: params.name,
        role: userRole,
      },
      create: {
        clerkUserId: params.clerkUserId,
        organizationId: organization.id,
        email: params.email,
        name: params.name,
        role: userRole,
      },
    });

    return {
      organizationId: organization.id,
      userId: user.id,
      userRole: user.role as UserRole,
      userEmail: user.email,
    };
  }
}
