import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@knowledge/shared';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  },
);
