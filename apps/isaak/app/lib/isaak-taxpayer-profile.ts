// I7 R000 — Perfil fiscal del contribuyente: persistencia + validación.
//
// La capa pura (`validateProfileInput`, `normalizeBooleansFromCi`) se
// puede testear sin Prisma. Las funciones de DB envuelven el modelo
// IsaakTaxpayerProfile y son thin wrappers idempotentes.

import { prisma } from './prisma';
import type {
  TaxpayerProfileSnapshot,
  TaxpayerType,
  FiscalTerritory,
  VatRegime,
} from './inspector-aeat';

export const TAXPAYER_TYPES = [
  'autonomo', 'sl', 'sa', 'comunidad_bienes', 'asociacion', 'fundacion',
] as const;

export const TERRITORIES = [
  'comun', 'canarias', 'pais_vasco', 'navarra', 'ceuta_melilla',
] as const;

export const VAT_REGIMES = [
  'general', 'recargo_equivalencia', 'criterio_caja',
  'simplificado', 'prorrata', 'sii', 'exento',
] as const;

export type TaxpayerProfileInput = {
  tenantId: string;
  taxpayerType?: TaxpayerType | null;
  territory?: FiscalTerritory | null;
  vatRegime?: VatRegime | null;
  sector?: string | null;
  corporateTaxSubject?: boolean | null;
  hasEmployees?: boolean | null;
  hasRentWithholding?: boolean | null;
  hasProfessionalInvoices?: boolean | null;
  hasIntraEUOperations?: boolean | null;
  hasRelatedParties?: boolean | null;
  usesBillingSoftware?: boolean | null;
  annualTurnover?: number | string | null;
  notes?: string | null;
  // Cuando viene del wizard tras revisar el prefill CI, marcar confirmed.
  confirmedByUser?: boolean;
  confirmedBy?: string | null;
  // Cuando es prefill automático desde Company Intelligence.
  prefilledFromCi?: boolean;
};

export type NormalizedTaxpayerProfile = {
  tenantId: string;
  taxpayerType: TaxpayerType | null;
  territory: FiscalTerritory | null;
  vatRegime: VatRegime | null;
  sector: string | null;
  corporateTaxSubject: boolean | null;
  hasEmployees: boolean | null;
  hasRentWithholding: boolean | null;
  hasProfessionalInvoices: boolean | null;
  hasIntraEUOperations: boolean | null;
  hasRelatedParties: boolean | null;
  usesBillingSoftware: boolean | null;
  annualTurnover: string | null; // decimal as string
  notes: string | null;
  confirmedByUser: boolean;
  confirmedBy: string | null;
  prefilledFromCi: boolean;
};

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

export function validateTaxpayerProfileInput(
  input: TaxpayerProfileInput,
): NormalizedTaxpayerProfile {
  if (!UUID_REGEX.test(input.tenantId)) {
    throw new Error('validateTaxpayerProfileInput: tenantId must be UUID');
  }
  if (
    input.taxpayerType !== null &&
    input.taxpayerType !== undefined &&
    !(TAXPAYER_TYPES as ReadonlyArray<string>).includes(input.taxpayerType)
  ) {
    throw new Error(`Invalid taxpayerType: ${input.taxpayerType}`);
  }
  if (
    input.territory !== null &&
    input.territory !== undefined &&
    !(TERRITORIES as ReadonlyArray<string>).includes(input.territory)
  ) {
    throw new Error(`Invalid territory: ${input.territory}`);
  }
  if (
    input.vatRegime !== null &&
    input.vatRegime !== undefined &&
    !(VAT_REGIMES as ReadonlyArray<string>).includes(input.vatRegime)
  ) {
    throw new Error(`Invalid vatRegime: ${input.vatRegime}`);
  }
  let turnover: string | null = null;
  if (input.annualTurnover !== null && input.annualTurnover !== undefined) {
    const n =
      typeof input.annualTurnover === 'string'
        ? Number.parseFloat(input.annualTurnover)
        : input.annualTurnover;
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('annualTurnover must be a non-negative number');
    }
    turnover = n.toFixed(2);
  }
  const sector =
    typeof input.sector === 'string' && input.sector.trim().length > 0
      ? input.sector.trim().toLowerCase()
      : null;
  const notes =
    typeof input.notes === 'string' && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    tenantId: input.tenantId,
    taxpayerType: (input.taxpayerType ?? null) as TaxpayerType | null,
    territory: (input.territory ?? null) as FiscalTerritory | null,
    vatRegime: (input.vatRegime ?? null) as VatRegime | null,
    sector,
    corporateTaxSubject: input.corporateTaxSubject ?? null,
    hasEmployees: input.hasEmployees ?? null,
    hasRentWithholding: input.hasRentWithholding ?? null,
    hasProfessionalInvoices: input.hasProfessionalInvoices ?? null,
    hasIntraEUOperations: input.hasIntraEUOperations ?? null,
    hasRelatedParties: input.hasRelatedParties ?? null,
    usesBillingSoftware: input.usesBillingSoftware ?? null,
    annualTurnover: turnover,
    notes,
    confirmedByUser: input.confirmedByUser === true,
    confirmedBy: input.confirmedBy ?? null,
    prefilledFromCi: input.prefilledFromCi === true,
  };
}

// CI usa LegalForm UPPER_CASE, TaxResidence/VatRegime UPPER_CASE.
// El Inspector usa minúsculas. Esta función traduce el output de
// CompanyIntelligenceService.buildProfile a TaxpayerProfileInput.
export function mapCompanyProfileToTaxpayerInput(args: {
  tenantId: string;
  ci: {
    legalForm?: string | null;
    taxResidence?: string | null;
    vatRegime?: string | null;
    sector?: string | null;
    corporateTaxSubject?: boolean | null;
    hasIntraEUOperations?: boolean | null;
    annualTurnover?: number | null;
  };
}): TaxpayerProfileInput {
  const ci = args.ci;
  const legalFormMap: Record<string, TaxpayerType | null> = {
    SL: 'sl', SA: 'sa', AUTONOMO: 'autonomo', CB: 'comunidad_bienes',
    SCP: 'comunidad_bienes', COOP: 'asociacion',
    ASOCIACION: 'asociacion', FUNDACION: 'fundacion',
  };
  const territoryMap: Record<string, FiscalTerritory | null> = {
    REGIMEN_COMUN: 'comun', CANARIAS: 'canarias',
    PAIS_VASCO: 'pais_vasco', NAVARRA: 'navarra',
    CEUTA_MELILLA: 'ceuta_melilla',
  };
  const vatMap: Record<string, VatRegime | null> = {
    GENERAL: 'general', RECARGO_EQUIVALENCIA: 'recargo_equivalencia',
    CRITERIO_CAJA: 'criterio_caja', EXENTO: 'exento',
    PRORRATA: 'prorrata', SII: 'sii',
  };
  return {
    tenantId: args.tenantId,
    taxpayerType: ci.legalForm ? (legalFormMap[ci.legalForm] ?? null) : null,
    territory: ci.taxResidence ? (territoryMap[ci.taxResidence] ?? null) : null,
    vatRegime: ci.vatRegime ? (vatMap[ci.vatRegime] ?? null) : null,
    sector: ci.sector ?? null,
    corporateTaxSubject: ci.corporateTaxSubject ?? null,
    hasIntraEUOperations: ci.hasIntraEUOperations ?? null,
    annualTurnover: ci.annualTurnover ?? null,
    prefilledFromCi: true,
    confirmedByUser: false,
  };
}

// Convierte un IsaakTaxpayerProfile (Prisma row) en
// TaxpayerProfileSnapshot que consume el Inspector AEAT.
export function toSnapshot(
  row: NormalizedTaxpayerProfile,
): TaxpayerProfileSnapshot {
  return {
    taxpayerType: row.taxpayerType,
    territory: row.territory,
    vatRegime: row.vatRegime,
    sector: row.sector,
    corporateTaxSubject: row.corporateTaxSubject,
    hasEmployees: row.hasEmployees,
    hasRentWithholding: row.hasRentWithholding,
    hasProfessionalInvoices: row.hasProfessionalInvoices,
    hasIntraEUOperations: row.hasIntraEUOperations,
    hasRelatedParties: row.hasRelatedParties,
    usesBillingSoftware: row.usesBillingSoftware,
    annualTurnover: row.annualTurnover ? Number.parseFloat(row.annualTurnover) : null,
  };
}

// ─── DB wrappers ───────────────────────────────────────────────────────

export async function upsertTaxpayerProfile(
  input: TaxpayerProfileInput,
): Promise<{ id: string; isNew: boolean }> {
  const norm = validateTaxpayerProfileInput(input);
  const existing = await prisma.isaakTaxpayerProfile.findUnique({
    where: { tenantId: norm.tenantId },
    select: { id: true },
  });

  const data = {
    taxpayerType: norm.taxpayerType,
    territory: norm.territory,
    vatRegime: norm.vatRegime,
    sector: norm.sector,
    corporateTaxSubject: norm.corporateTaxSubject,
    hasEmployees: norm.hasEmployees,
    hasRentWithholding: norm.hasRentWithholding,
    hasProfessionalInvoices: norm.hasProfessionalInvoices,
    hasIntraEUOperations: norm.hasIntraEUOperations,
    hasRelatedParties: norm.hasRelatedParties,
    usesBillingSoftware: norm.usesBillingSoftware,
    annualTurnover: norm.annualTurnover,
    notes: norm.notes,
    confirmedByUser: norm.confirmedByUser,
    confirmedAt: norm.confirmedByUser ? new Date() : null,
    confirmedBy: norm.confirmedBy,
    prefilledFromCi: norm.prefilledFromCi,
    prefilledAt: norm.prefilledFromCi ? new Date() : null,
  };

  if (existing) {
    await prisma.isaakTaxpayerProfile.update({
      where: { id: existing.id },
      data,
    });
    return { id: existing.id, isNew: false };
  }
  const created = await prisma.isaakTaxpayerProfile.create({
    data: { tenantId: norm.tenantId, ...data },
    select: { id: true },
  });
  return { id: created.id, isNew: true };
}

export async function getTaxpayerProfile(
  tenantId: string,
): Promise<NormalizedTaxpayerProfile | null> {
  const row = await prisma.isaakTaxpayerProfile.findUnique({
    where: { tenantId },
  });
  if (!row) return null;
  return {
    tenantId: row.tenantId,
    taxpayerType: row.taxpayerType as TaxpayerType | null,
    territory: row.territory as FiscalTerritory | null,
    vatRegime: row.vatRegime as VatRegime | null,
    sector: row.sector,
    corporateTaxSubject: row.corporateTaxSubject,
    hasEmployees: row.hasEmployees,
    hasRentWithholding: row.hasRentWithholding,
    hasProfessionalInvoices: row.hasProfessionalInvoices,
    hasIntraEUOperations: row.hasIntraEUOperations,
    hasRelatedParties: row.hasRelatedParties,
    usesBillingSoftware: row.usesBillingSoftware,
    annualTurnover: row.annualTurnover?.toString() ?? null,
    notes: row.notes,
    confirmedByUser: row.confirmedByUser,
    confirmedBy: row.confirmedBy,
    prefilledFromCi: row.prefilledFromCi,
  };
}

export async function getTaxpayerProfileAsSnapshot(
  tenantId: string,
): Promise<TaxpayerProfileSnapshot | null> {
  const row = await getTaxpayerProfile(tenantId);
  return row ? toSnapshot(row) : null;
}
