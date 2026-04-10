import { query } from '@/lib/db';

export type TenantProfileColumnAvailability = {
  representativeRole: boolean;
  website: boolean;
  cnaeCode: boolean;
  cnaeText: boolean;
  postalCode: boolean;
  country: boolean;
};

let tenantProfileColumnAvailability: TenantProfileColumnAvailability | null = null;

export function resetTenantProfileColumnAvailabilityCache() {
  tenantProfileColumnAvailability = null;
}

export async function getTenantProfileColumnAvailability(): Promise<TenantProfileColumnAvailability> {
  if (tenantProfileColumnAvailability) {
    return tenantProfileColumnAvailability;
  }

  const trackedColumns = [
    'representative_role',
    'website',
    'cnae_code',
    'cnae_text',
    'postal_code',
    'country',
  ];

  const rows = await query<{ column_name: string }>(
    [
      'SELECT column_name',
      'FROM information_schema.columns',
      "WHERE table_schema = 'public' AND table_name = 'tenant_profiles'",
      'AND column_name = ANY($1::text[])',
    ].join(' '),
    [trackedColumns]
  );

  const available = new Set(rows.map((row) => row.column_name));

  tenantProfileColumnAvailability = {
    representativeRole: available.has('representative_role'),
    website: available.has('website'),
    cnaeCode: available.has('cnae_code'),
    cnaeText: available.has('cnae_text'),
    postalCode: available.has('postal_code'),
    country: available.has('country'),
  };

  return tenantProfileColumnAvailability;
}

export function buildTenantProfileOnboardingSelect(availability: TenantProfileColumnAvailability) {
  return {
    tradeName: true,
    legalName: true,
    representative: true,
    ...(availability.representativeRole ? { representativeRole: true } : {}),
    email: true,
    phone: true,
    ...(availability.website ? { website: true } : {}),
    cnae: true,
    ...(availability.cnaeCode ? { cnaeCode: true } : {}),
    ...(availability.cnaeText ? { cnaeText: true } : {}),
    address: true,
    fiscalAddress: true,
    ...(availability.postalCode ? { postalCode: true } : {}),
    city: true,
    province: true,
    ...(availability.country ? { country: true } : {}),
  };
}
