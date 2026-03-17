import {
  type AccountingEntityType,
  type AccountingSourceKind,
  type CanonicalOwnershipMode,
  type SyncDirection,
} from '@/lib/integrations/canonicalModel';

export type TenantOperatingMode =
  | 'native_excel'
  | 'holded_augmented'
  | 'external_augmented';

export type EntitySyncPolicy = {
  entity: AccountingEntityType;
  preferredSource: AccountingSourceKind;
  allowedSources: AccountingSourceKind[];
  ownership: CanonicalOwnershipMode;
  direction: SyncDirection;
  isaakRole: 'explain' | 'migrate' | 'validate' | 'orchestrate';
};

export const DEFAULT_NATIVE_POLICIES: Record<AccountingEntityType, EntitySyncPolicy> = {
  invoice: {
    entity: 'invoice',
    preferredSource: 'verifactu_native',
    allowedSources: ['verifactu_native', 'excel_aeat', 'holded', 'external_api'],
    ownership: 'native_master',
    direction: 'push',
    isaakRole: 'orchestrate',
  },
  quote: {
    entity: 'quote',
    preferredSource: 'verifactu_native',
    allowedSources: ['verifactu_native', 'holded', 'external_api'],
    ownership: 'native_master',
    direction: 'bidirectional',
    isaakRole: 'orchestrate',
  },
  expense: {
    entity: 'expense',
    preferredSource: 'excel_aeat',
    allowedSources: ['verifactu_native', 'excel_aeat', 'holded', 'external_api'],
    ownership: 'shared_with_conflicts',
    direction: 'bidirectional',
    isaakRole: 'validate',
  },
  customer: {
    entity: 'customer',
    preferredSource: 'verifactu_native',
    allowedSources: ['verifactu_native', 'holded', 'external_api'],
    ownership: 'shared_with_conflicts',
    direction: 'bidirectional',
    isaakRole: 'migrate',
  },
  supplier: {
    entity: 'supplier',
    preferredSource: 'verifactu_native',
    allowedSources: ['verifactu_native', 'excel_aeat', 'holded', 'external_api'],
    ownership: 'shared_with_conflicts',
    direction: 'bidirectional',
    isaakRole: 'migrate',
  },
  account: {
    entity: 'account',
    preferredSource: 'holded',
    allowedSources: ['holded', 'external_api'],
    ownership: 'external_master',
    direction: 'pull',
    isaakRole: 'explain',
  },
  tax_profile: {
    entity: 'tax_profile',
    preferredSource: 'verifactu_native',
    allowedSources: ['verifactu_native', 'excel_aeat', 'external_api'],
    ownership: 'native_master',
    direction: 'push',
    isaakRole: 'validate',
  },
};

export function getSyncPoliciesForMode(mode: TenantOperatingMode) {
  if (mode === 'native_excel') {
    return DEFAULT_NATIVE_POLICIES;
  }

  if (mode === 'holded_augmented') {
    return {
      ...DEFAULT_NATIVE_POLICIES,
      invoice: {
        ...DEFAULT_NATIVE_POLICIES.invoice,
        preferredSource: 'holded' as const,
        ownership: 'shared_with_conflicts' as const,
        direction: 'bidirectional' as const,
      },
      customer: {
        ...DEFAULT_NATIVE_POLICIES.customer,
        preferredSource: 'holded' as const,
      },
      account: {
        ...DEFAULT_NATIVE_POLICIES.account,
        preferredSource: 'holded' as const,
        ownership: 'external_master' as const,
      },
    };
  }

  return {
    ...DEFAULT_NATIVE_POLICIES,
    invoice: {
      ...DEFAULT_NATIVE_POLICIES.invoice,
      preferredSource: 'external_api' as const,
      ownership: 'shared_with_conflicts' as const,
      direction: 'bidirectional' as const,
    },
    customer: {
      ...DEFAULT_NATIVE_POLICIES.customer,
      preferredSource: 'external_api' as const,
    },
    account: {
      ...DEFAULT_NATIVE_POLICIES.account,
      preferredSource: 'external_api' as const,
    },
  };
}

export function resolveSyncPolicy(mode: TenantOperatingMode, entity: AccountingEntityType) {
  return getSyncPoliciesForMode(mode)[entity];
}

export function inferTenantOperatingMode(input: {
  hasHoldedIntegration?: boolean;
  hasExternalAccountingIntegration?: boolean;
  prefersNativeExcel?: boolean;
}): TenantOperatingMode {
  if (input.prefersNativeExcel || (!input.hasHoldedIntegration && !input.hasExternalAccountingIntegration)) {
    return 'native_excel';
  }

  if (input.hasHoldedIntegration) {
    return 'holded_augmented';
  }

  return 'external_augmented';
}
