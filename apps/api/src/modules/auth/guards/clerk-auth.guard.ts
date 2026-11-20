import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { UserRole } from '@knowledge/shared';
import { AuthService } from '../auth.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private secretKey: string | undefined;

  constructor(private readonly authService: AuthService) {
    this.secretKey = process.env.CLERK_SECRET_KEY;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // 1. Check for development / testing mock header (strictly rejected in production)
    const mockUserHeader = request.headers['x-mock-user-id'];
    if (process.env.NODE_ENV !== 'production' && mockUserHeader) {
      const mockOrg = (request.headers['x-mock-org-id'] as string) || 'mock-org-default';
      const mockRole = (request.headers['x-mock-role'] as UserRole) || UserRole.ADMIN;
      const mockEmail =
        (request.headers['x-mock-email'] as string) || 'test-engineer@company.internal';

      const tenantContext = await this.authService.resolveTenantContext({
        clerkUserId: mockUserHeader as string,
        clerkOrgId: mockOrg,
        email: mockEmail,
        name: 'Test Engineer',
        role: mockRole,
      });

      request.tenantContext = tenantContext;
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify server-issued HMAC-SHA256 Portfolio Demo Session Bearer token
    if (token && token.startsWith('demo.')) {
      if (typeof this.authService.verifyDemoSessionToken !== 'function') {
        throw new UnauthorizedException('Demo session verification unavailable');
      }
      const demoPayload = this.authService.verifyDemoSessionToken(token);
      if (!demoPayload) {
        throw new UnauthorizedException('Invalid or expired demo session token');
      }

      const tenantContext = await this.authService.resolveTenantContext({
        clerkUserId: demoPayload.sub,
        clerkOrgId: demoPayload.org,
        email: demoPayload.email,
        name: 'Portfolio Demo Workspace',
        role: demoPayload.role,
      });

      request.tenantContext = tenantContext;
      return true;
    }

    // 3. Verify standard Clerk JWT token
    try {
      if (!this.secretKey || this.secretKey.startsWith('sk_test_...')) {
        if (process.env.NODE_ENV !== 'production') {
          const tenantContext = await this.authService.resolveTenantContext({
            clerkUserId: 'dev-user-01',
            clerkOrgId: 'dev-org-01',
            email: 'dev@company.internal',
            name: 'Dev Admin',
            role: UserRole.ADMIN,
          });
          request.tenantContext = tenantContext;
          return true;
        }
        throw new UnauthorizedException('Clerk secret key is not configured');
      }

      const verified = await verifyToken(token, { secretKey: this.secretKey });
      if (!verified || !verified.sub) {
        throw new UnauthorizedException('Invalid Clerk JWT token');
      }

      const clerkOrgId = (verified as Record<string, unknown>).org_id as string | undefined;
      const clerkEmail =
        ((verified as Record<string, unknown>).email as string) || `${verified.sub}@clerk.user`;
      const clerkRole =
        ((verified as Record<string, unknown>).org_role as string) === 'org:admin'
          ? UserRole.ADMIN
          : UserRole.MEMBER;

      const tenantContext = await this.authService.resolveTenantContext({
        clerkUserId: verified.sub,
        clerkOrgId,
        email: clerkEmail,
        role: clerkRole,
      });

      request.tenantContext = tenantContext;
      return true;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const error = err as Error;
      this.logger.error(`Clerk auth verification failed: ${error.message}`);
      throw new UnauthorizedException(error.message || 'Authentication failed');
    }
  }
}
