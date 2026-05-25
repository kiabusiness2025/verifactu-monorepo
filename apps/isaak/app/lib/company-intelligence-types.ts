/**
 * Company Intelligence — tipos principales.
 *
 * Cada dato de empresa guarda fuente, fecha de consulta y nivel de confianza
 * (provenance). Las obligaciones fiscales inferidas son "probables", no definitivas.
 */

// ── Enums / union types ───────────────────────────────────────────────────────

export type LegalForm =
  | 'SL'
  | 'SA'
  | 'AUTONOMO'
  | 'CB'
  | 'SCP'
  | 'COOP'
  | 'ASOCIACION'
  | 'FUNDACION'
  | 'UNKNOWN';

export type TaxResidence =
  | 'REGIMEN_COMUN'
  | 'CANARIAS'
  | 'PAIS_VASCO'
  | 'NAVARRA'
  | 'CEUTA_MELILLA'
  | 'UNKNOWN';

export type TaxpayerType = 'AUTONOMO' | 'SOCIEDAD' | 'ENTIDAD' | 'UNKNOWN';

export type VatRegime =
  | 'GENERAL'
  | 'RECARGO_EQUIVALENCIA'
  | 'CRITERIO_CAJA'
  | 'EXENTO'
  | 'PRORRATA'
  | 'SII'
  | 'UNKNOWN';

export type FiscalObligation =
  | 'MODEL_303'
  | 'MODEL_111'
  | 'MODEL_115'
  | 'MODEL_130'
  | 'MODEL_200'
  | 'MODEL_202'
  | 'MODEL_347'
  | 'MODEL_349'
  | 'VERIFACTU_SIF'
  | 'B2B_EINVOICING';

export type FiscalWarningFlag =
  | 'MISSING_NIF'
  | 'INVALID_NIF_FORMAT'
  | 'MISSING_LEGAL_FORM'
  | 'MISSING_TAX_RESIDENCE'
  | 'MISSING_VAT_REGIME'
  | 'POSSIBLE_RELATED_PARTY_RISK'
  | 'VIES_INVALID'
  | 'BORME_RISK_EVENT_DETECTED'
  | 'LOW_CONFIDENCE_COMPANY_MATCH';

export type DataSource =
  | 'USER'
  | 'BORME'
  | 'VIES'
  | 'GLEIF'
  | 'PLACSP'
  | 'DATOS_GOB_ES'
  | 'REGISTRADORES_MANUAL'
  | 'SYSTEM_INFERENCE';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type RegistryEventType =
  | 'INCORPORATION'
  | 'NAME_CHANGE'
  | 'REGISTERED_ADDRESS_CHANGE'
  | 'ADMINISTRATOR_APPOINTMENT'
  | 'ADMINISTRATOR_TERMINATION'
  | 'CAPITAL_INCREASE'
  | 'CAPITAL_DECREASE'
  | 'DISSOLUTION'
  | 'LIQUIDATION'
  | 'MERGER'
  | 'SPIN_OFF'
  | 'OTHER';

export type CompanyStatusSignal =
  | 'ACTIVE_ASSUMED'
  | 'RECENT_ADDRESS_CHANGE'
  | 'RECENT_ADMIN_CHANGE'
  | 'DISSOLUTION_DETECTED'
  | 'LIQUIDATION_DETECTED'
  | 'MERGER_DETECTED'
  | 'INSUFFICIENT_REGISTRY_DATA';

// ── Core entity types ─────────────────────────────────────────────────────────

export type RegistryEvent = {
  source: 'BORME' | 'USER' | 'OTHER';
  eventType: RegistryEventType;
  date?: string;
  description: string;
  rawReference?: string;
  confidence: Confidence;
};

export type CompanyDataProvenance = {
  source: DataSource;
  retrievedAt: string; // ISO 8601
  confidence: Confidence;
  fields: string[];
  reference?: string;
};

export type PublicContractSignal = {
  source: 'PLACSP';
  contractTitle?: string;
  contractingAuthority?: string;
  awardDate?: string;
  amount?: number;
  cpv?: string;
  confidence: Confidence;
};

export type LeiSignal = {
  lei: string;
  status?: string;
  legalName?: string;
  jurisdiction?: string;
  confidence: Confidence;
};

export type ViesSignal = {
  vatNumber: string;
  valid: boolean;
  checkedAt: string; // ISO 8601
  name?: string;
  address?: string;
  confidence: Confidence;
};

// ── CompanyProfile — ficha completa ───────────────────────────────────────────

export type CompanyProfile = {
  identity: {
    legalName: string;
    normalizedLegalName: string;
    nif?: string;
    vatNumber?: string;
    legalForm?: LegalForm;
    registeredAddress?: string;
    taxResidence?: TaxResidence;
    province?: string;
    country?: string;
  };

  registry: {
    events: RegistryEvent[];
    incorporationDate?: string;
    statusSignals: CompanyStatusSignal[];
  };

  fiscal: {
    likelyTaxpayerType?: TaxpayerType;
    likelyVatRegime?: VatRegime;
    likelyObligations: FiscalObligation[];
    warningFlags: FiscalWarningFlag[];
  };

  businessSignals: {
    publicContracts?: PublicContractSignal[];
    lei?: LeiSignal;
    vies?: ViesSignal;
  };

  provenance: CompanyDataProvenance[];
};

// ── CompanyProfileInput — datos de entrada del usuario ───────────────────────

export type CompanyProfileInput = {
  legalName?: string;
  nif?: string;
  vatNumber?: string;
  province?: string;
  country?: string;
  address?: string;
  declaredLegalForm?: LegalForm;
  declaredTaxResidence?: TaxResidence;
  declaredActivity?: string;
  hasEmployees?: boolean;
  hasRentWithholding?: boolean;
  hasProfessionalInvoices?: boolean;
  hasIntraEUOperations?: boolean;
  usesBillingSoftware?: boolean;
  annualTurnover?: number;
};

// ── CompanyMatch — resultado de búsqueda en fuente ───────────────────────────

export type CompanyMatch = {
  source: DataSource;
  legalName?: string;
  normalizedLegalName?: string;
  nif?: string;
  vatNumber?: string;
  province?: string;
  address?: string;
  rawReference?: string;
  score?: number;
  confidence?: Confidence;
};

// ── Scoring ───────────────────────────────────────────────────────────────────

export type CompanyMatchScore = {
  score: number; // 0–100
  confidence: Confidence;
  reasons: string[];
};
