import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';
import { MissingScopeError, PermissionDeniedError, TenantNotFoundError } from '../api/errors';

export async function checkPermission(ctx: IsaakExecutionContext, scope: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { id: true },
  });
  if (!tenant) throw new TenantNotFoundError();

  if (!ctx.scopes.includes(scope)) throw new MissingScopeError(scope);
}

export async function assertTenantExists(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) throw new TenantNotFoundError();
}

export function assertBelongsToTenant(resourceTenantId: string, ctx: IsaakExecutionContext): void {
  if (resourceTenantId !== ctx.tenantId) {
    throw new PermissionDeniedError('Este recurso no pertenece a tu empresa.');
  }
}
