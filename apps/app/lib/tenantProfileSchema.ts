import { query } from '@/lib/db';

export type TenantProfileColumnAvailability = {
  representativeRole: boolean;
  website: boolean;
  cnaeCode: boolean;
  cnaeText: boolean;
  postalCode: boolean;
  country: boolean;
  legalForm: boolean;
  status: boolean;
  capitalSocial: boolean;
  employees: boolean;
  sales: boolean;
  salesYear: boolean;
  lastBalanceDate: boolean;
};

export const LEGACY_TENANT_PROFILE_COLUMN_AVAILABILITY: TenantProfileColumnAvailability = {
  representativeRole: false,
  website: false,
  cnaeCode: false,
  cnaeText: false,
  postalCode: false,
  country: false,
  legalForm: false,
  status: false,
  capitalSocial: false,
  employees: false,
  sales: false,
  salesYear: false,
  lastBalanceDate: false,
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
    'legal_form',
    'status',
    'capital_social',
    'employees',
    'sales',
    'sales_year',
    'last_balance_date',
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
    legalForm: available.has('legal_form'),
    status: available.has('status'),
    capitalSocial: available.has('capital_social'),
    employees: available.has('employees'),
    sales: available.has('sales'),
    salesYear: available.has('sales_year'),
    lastBalanceDate: available.has('last_balance_date'),
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

export function isMissingTenantProfileColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('tenant_profiles.') && message.includes('does not exist');
}
