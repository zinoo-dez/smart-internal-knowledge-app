import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  DemoSessionResponse,
  Department,
  TenantContext,
  UserRole,
} from '@knowledge/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface DemoSessionPayload {
  sub: string;
  org: string;
  email: string;
  role: UserRole;
  dept: Department;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly ephemeralSecret = crypto.randomBytes(32);
  private readonly DEMO_TOKEN_PREFIX = 'demo.';
  private readonly DEMO_TTL_SECONDS = 24 * 60 * 60; // 24 hours

  constructor(private readonly prisma: PrismaService) {}

  private getDemoSigningKey(): Buffer {
    const envSecret = process.env.DEMO_SESSION_SECRET || process.env.ENCRYPTION_SECRET;
    if (envSecret && envSecret.length >= 16) {
      return crypto.createHash('sha256').update(envSecret).digest();
    }
    return this.ephemeralSecret;
  }

  private isDemoAuthAllowed(): boolean {
    if (process.env.DEMO_AUTH_ENABLED === 'false') {
      return false;
    }
    // Fail-safe: when a real live Clerk production key is configured, require explicit opt-in
    const hasLiveClerkKey = Boolean(process.env.CLERK_SECRET_KEY?.startsWith('sk_live_'));
    if (hasLiveClerkKey && process.env.DEMO_AUTH_ENABLED !== 'true') {
      return false;
    }
    return true;
  }

  /**
   * Issues a server-signed HMAC-SHA256 demo session Bearer token for instant
   * frictionless portfolio access without exposing unverified x-mock-* headers.
   */
  issueDemoSessionToken(): DemoSessionResponse {
    if (!this.isDemoAuthAllowed()) {
      throw new ForbiddenException('Demo session authentication is disabled in this environment');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.DEMO_TTL_SECONDS;
    const role =
      process.env.DEMO_AUTH_ROLE === UserRole.MEMBER ? UserRole.MEMBER : UserRole.ADMIN;
    const orgId = process.env.DEMO_ORG_ID || 'mock-org-default';
    const userId = process.env.DEMO_USER_ID || 'dev-admin-01';

    const payload: DemoSessionPayload = {
      sub: userId,
      org: orgId,
      email: 'admin@company.internal',
      role,
      dept: Department.ALL,
      iat: now,
      exp,
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getDemoSigningKey())
      .update(encodedPayload)
      .digest('base64url');

    return {
      token: `${this.DEMO_TOKEN_PREFIX}${encodedPayload}.${signature}`,
      expiresAt: new Date(exp * 1000).toISOString(),
      organizationId: orgId,
      userId,
      userRole: role,
    };
  }

  /**
   * Cryptographically verifies a server-issued demo Bearer token using timing-safe HMAC comparison.
   */
  verifyDemoSessionToken(token: string): DemoSessionPayload | null {
    if (!this.isDemoAuthAllowed()) {
      return null;
    }
    if (!token || !token.startsWith(this.DEMO_TOKEN_PREFIX)) {
      return null;
    }

    const body = token.slice(this.DEMO_TOKEN_PREFIX.length);
    const parts = body.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, providedSig] = parts;
    if (!encodedPayload || !providedSig) {
      return null;
    }

    const expectedSig = crypto
      .createHmac('sha256', this.getDemoSigningKey())
      .update(encodedPayload)
      .digest('base64url');

    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return null;
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as DemoSessionPayload;

      const now = Math.floor(Date.now() / 1000);
      if (!parsed.sub || !parsed.org || typeof parsed.exp !== 'number' || parsed.exp <= now) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async resolveTenantContext(params: {
    clerkUserId: string;
    clerkOrgId?: string;
    email: string;
    name?: string;
    role?: UserRole;
  }): Promise<TenantContext> {
    const orgId = params.clerkOrgId || `personal-${params.clerkUserId}`;
    const userRole = params.role || UserRole.MEMBER;

    try {
      // Ensure Organization exists
      const organization = await this.prisma.client.organization.upsert({
        where: { clerkOrgId: orgId },
        update: {},
        create: {
          clerkOrgId: orgId,
          name: params.clerkOrgId
            ? `Workspace ${orgId}`
            : `${params.name || params.email}'s Workspace`,
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
        department: (user.department as Department) || Department.ALL,
      };
    } catch (err) {
      const error = err as Error;
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `Database unavailable during tenant context resolution: ${error.message}`,
        );
        throw new ServiceUnavailableException(
          'Authentication datastore is temporarily unavailable',
        );
      }

      this.logger.warn(`Prisma offline, serving dev fallback tenant context: ${error.message}`);
      return {
        organizationId: orgId,
        userId: params.clerkUserId,
        userRole,
        userEmail: params.email,
        department: Department.ALL,
      };
    }
  }
}
