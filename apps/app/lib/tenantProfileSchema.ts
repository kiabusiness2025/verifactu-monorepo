import { one } from '@/lib/db';

let tenantProfileRepresentativeRoleColumnAvailable: boolean | null = null;

export async function hasTenantProfileRepresentativeRoleColumn() {
  if (tenantProfileRepresentativeRoleColumnAvailable !== null) {
    return tenantProfileRepresentativeRoleColumnAvailable;
  }

  const row = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM information_schema.columns',
      "  WHERE table_schema = 'public' AND table_name = 'tenant_profiles' AND column_name = 'representative_role'",
      ') AS exists',
    ].join(' ')
  );

  tenantProfileRepresentativeRoleColumnAvailable = row?.exists === true;
  return tenantProfileRepresentativeRoleColumnAvailable;
}

export function buildTenantProfileOnboardingSelect(hasRepresentativeRoleColumn: boolean) {
  return {
    tradeName: true,
    legalName: true,
    representative: true,
    ...(hasRepresentativeRoleColumn ? { representativeRole: true } : {}),
    email: true,
    phone: true,
    website: true,
    cnae: true,
    cnaeCode: true,
    cnaeText: true,
    address: true,
    postalCode: true,
    city: true,
    province: true,
    country: true,
  };
}
