import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';
import { TenantNotFoundError } from '../api/errors';

export type CompanyContext = {
  id: string;
  name: string;
  legalName: string | null;
  nif: string | null;
  fiscalAddress: {
    street: string | null;
    city: string | null;
    postalCode: string | null;
    province: string | null;
    country: string | null;
  } | null;
  taxRegime: string | null;
  verifactuEnabled: boolean;
  createdAt: Date;
};

export async function getCompanyContext(ctx: IsaakExecutionContext): Promise<CompanyContext> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      id: true,
      name: true,
      legalName: true,
      nif: true,
      createdAt: true,
      profile: {
        select: {
          taxRegime: true,
          address: true,
          city: true,
          postalCode: true,
          province: true,
          country: true,
        },
      },
    },
  });

  if (!tenant) throw new TenantNotFoundError();

  return {
    id: tenant.id,
    name: tenant.name,
    legalName: tenant.legalName,
    nif: tenant.nif,
    fiscalAddress: tenant.profile
      ? {
          street: tenant.profile.address,
          city: tenant.profile.city,
          postalCode: tenant.profile.postalCode,
          province: tenant.profile.province,
          country: tenant.profile.country,
        }
      : null,
    taxRegime: tenant.profile?.taxRegime ?? null,
    verifactuEnabled: Boolean(tenant.nif),
    createdAt: tenant.createdAt,
  };
}
