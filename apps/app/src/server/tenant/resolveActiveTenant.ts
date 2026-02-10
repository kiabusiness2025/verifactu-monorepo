import {
    SUPPORT_SESSION_COOKIE,
    verifySupportToken,
} from "@/src/server/support/supportToken";
import { prisma } from "@verifactu/db";
import { cookies } from "next/headers";

export type TenantLite = {
  id: string;
  name: string;
  legalName?: string | null;
  nif?: string | null;
  isDemo?: boolean;
};

export type ActiveTenantResult = {
  tenantId: string | null;
  tenant: TenantLite | null;
  supportMode: boolean;
  supportSessionId: string | null;
};

export async function resolveActiveTenant(input: {
  userId: string;
  sessionTenantId?: string | null;
  tenants?: TenantLite[];
  defaultTenantId?: string | null;
}): Promise<ActiveTenantResult> {
  const cookieStore = await cookies();
  const supportToken = cookieStore.get(SUPPORT_SESSION_COOKIE)?.value;

  if (supportToken) {
    try {
      const payload = await verifySupportToken(supportToken);
      const supportSession = await prisma.supportSession.findUnique({
        where: { id: payload.supportSessionId },
        select: {
          id: true,
          tenantId: true,
          endedAt: true,
          tenant: { select: { id: true, name: true, legalName: true, nif: true, isDemo: true } },
        },
      });

      if (supportSession && !supportSession.endedAt) {
        const tenant = supportSession.tenant;
        return {
          tenantId: supportSession.tenantId,
          tenant: tenant
            ? {
                id: tenant.id,
                name: tenant.name,
                legalName: tenant.legalName,
                nif: tenant.nif,
                isDemo: tenant.isDemo,
              }
            : null,
          supportMode: true,
          supportSessionId: supportSession.id,
        };
      }
    } catch {
      // Ignore invalid token and fall back to normal tenant resolution.
    }
  }

  let tenants = input.tenants;
  if (!tenants) {
    const memberships = await prisma.membership.findMany({
      where: { userId: input.userId, status: "active" },
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
    });
    tenants = memberships.map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      legalName: membership.tenant.legalName,
      nif: membership.tenant.nif,
      isDemo: membership.tenant.isDemo,
    }));
  }

  const preference = await prisma.userPreference.findUnique({
    where: { userId: input.userId },
  });

  const tenantFromSession =
    input.sessionTenantId && tenants.find((tenant) => tenant.id === input.sessionTenantId)
      ? input.sessionTenantId
      : null;

  const tenantId =
    tenantFromSession ?? preference?.preferredTenantId ?? input.defaultTenantId ?? tenants[0]?.id ?? null;

  const tenant = tenants.find((item) => item.id === tenantId) ?? null;

  return {
    tenantId,
    tenant,
    supportMode: false,
    supportSessionId: null,
  };
}
