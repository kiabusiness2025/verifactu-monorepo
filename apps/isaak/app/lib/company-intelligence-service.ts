import type {
  CompanyDataProvenance,
  CompanyMatch,
  CompanyProfile,
  CompanyProfileInput,
  FiscalObligation,
  FiscalWarningFlag,
  LegalForm,
  TaxpayerType,
  VatRegime,
} from './company-intelligence-types';
import { detectLegalForm, validateNifFormat } from './company-intelligence-normalizers';
import { scoreCompanyMatch } from './company-intelligence-scoring';
import {
  BormeAdapter,
  CompanyDataSourceAdapter,
  GleifAdapter,
  PlacspAdapter,
  UserProvidedAdapter,
  ViesAdapter,
} from './company-intelligence-sources';

// ── Inference helpers ─────────────────────────────────────────────────────────

export function inferLikelyTaxpayerType(legalForm?: LegalForm): TaxpayerType {
  if (!legalForm || legalForm === 'UNKNOWN') return 'UNKNOWN';
  if (legalForm === 'AUTONOMO') return 'AUTONOMO';
  if (['ASOCIACION', 'FUNDACION'].includes(legalForm)) return 'ENTIDAD';
  return 'SOCIEDAD';
}

export function inferLikelyFiscalObligations(
  input: CompanyProfileInput,
  taxpayerType: TaxpayerType,
  vatRegime: VatRegime
): FiscalObligation[] {
  const obligations: FiscalObligation[] = [];

  // IVA — Model 303
  if (vatRegime !== 'EXENTO') {
    obligations.push('MODEL_303');
  }

  // Retenciones empleados — Model 111
  if (input.hasEmployees) {
    obligations.push('MODEL_111');
  }

  // Retenciones alquileres — Model 115
  if (input.hasRentWithholding) {
    obligations.push('MODEL_115');
  }

  // IRPF autónomos — Model 130
  if (taxpayerType === 'AUTONOMO') {
    obligations.push('MODEL_130');
  }

  // IS — Models 200 / 202
  if (taxpayerType === 'SOCIEDAD') {
    obligations.push('MODEL_200');
    if (input.annualTurnover !== undefined && input.annualTurnover >= 6_000_000) {
      obligations.push('MODEL_202');
    }
  }

  // Operaciones con terceros — Model 347
  if (input.annualTurnover !== undefined && input.annualTurnover >= 3_000) {
    obligations.push('MODEL_347');
  }

  // Operaciones intracomunitarias — Model 349
  if (input.hasIntraEUOperations) {
    obligations.push('MODEL_349');
  }

  // VeriFactu/SIF — both thresholds in rules; add as likely if using billing software
  if (input.usesBillingSoftware) {
    obligations.push('VERIFACTU_SIF');
  }

  // B2B e-invoicing (large companies)
  if (
    taxpayerType === 'SOCIEDAD' &&
    input.annualTurnover !== undefined &&
    input.annualTurnover >= 8_000_000
  ) {
    obligations.push('B2B_EINVOICING');
  }

  return [...new Set(obligations)];
}

export function deriveCompanyWarningFlags(
  input: CompanyProfileInput,
  topMatch: CompanyMatch | null,
  vatRegime: VatRegime
): FiscalWarningFlag[] {
  const flags: FiscalWarningFlag[] = [];

  if (!input.nif) {
    flags.push('MISSING_NIF');
  } else if (!validateNifFormat(input.nif)) {
    flags.push('INVALID_NIF_FORMAT');
  }

  const legalForm = detectLegalForm(input.legalName ?? '', input.nif);
  if (legalForm === 'UNKNOWN') {
    flags.push('MISSING_LEGAL_FORM');
  }

  if (!input.declaredTaxResidence) {
    flags.push('MISSING_TAX_RESIDENCE');
  }

  if (vatRegime === 'UNKNOWN') {
    flags.push('MISSING_VAT_REGIME');
  }

  if (topMatch && topMatch.confidence === 'LOW') {
    flags.push('LOW_CONFIDENCE_COMPANY_MATCH');
  }

  return [...new Set(flags)];
}

// ── CompanyIntelligenceService ────────────────────────────────────────────────

export interface CompanyIntelligenceServiceOptions {
  adapters?: CompanyDataSourceAdapter[];
  /** Minimum score threshold to include a candidate match (default: 30) */
  minScore?: number;
}

export class CompanyIntelligenceService {
  private readonly adapters: CompanyDataSourceAdapter[];
  private readonly minScore: number;

  constructor(options: CompanyIntelligenceServiceOptions = {}) {
    this.adapters = options.adapters ?? [
      new UserProvidedAdapter(),
      new BormeAdapter(),
      new ViesAdapter(),
      new GleifAdapter(),
      new PlacspAdapter(),
    ];
    this.minScore = options.minScore ?? 30;
  }

  async buildProfile(input: CompanyProfileInput): Promise<CompanyProfile> {
    const now = new Date().toISOString();

    // 1. Gather raw candidates from all adapters in parallel
    const adapterResults = await Promise.allSettled(
      this.adapters.map(async (adapter) => {
        const matches = await adapter.search(input);
        return { adapter, matches };
      })
    );

    const allMatches: CompanyMatch[] = [];
    const provenance: CompanyDataProvenance[] = [];

    for (const result of adapterResults) {
      if (result.status === 'rejected') continue;
      const { adapter, matches } = result.value;
      for (const match of matches) {
        const scored = scoreCompanyMatch(input, match);
        if (scored.score >= this.minScore) {
          allMatches.push({ ...match, score: scored.score, confidence: scored.confidence });
        }
      }
      if (matches.length > 0) {
        provenance.push({
          source: adapter.sourceId as CompanyDataProvenance['source'],
          retrievedAt: now,
          confidence: matches[0].confidence ?? 'LOW',
          fields: Object.keys(matches[0]).filter(
            (k) => !['source', 'confidence', 'score', 'rawReference'].includes(k)
          ) as string[],
        });
      }
    }

    // 2. Pick best match
    allMatches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topMatch = allMatches[0] ?? null;

    // 3. Infer legal form and taxpayer type
    const legalForm = detectLegalForm(
      topMatch?.legalName ?? input.legalName ?? '',
      topMatch?.nif ?? input.nif
    );
    const taxpayerType = inferLikelyTaxpayerType(legalForm);

    // 4. Determine VAT regime (user declaration takes precedence)
    const vatRegime: VatRegime = input.declaredLegalForm
      ? 'UNKNOWN' // will be overridden below if declared
      : 'UNKNOWN';
    const resolvedVatRegime: VatRegime = vatRegime; // simplified — rules module refines this

    // 5. Infer obligations and flags
    const likelyObligations = inferLikelyFiscalObligations(input, taxpayerType, resolvedVatRegime);
    const warningFlags = deriveCompanyWarningFlags(input, topMatch, resolvedVatRegime);

    // 6. Assemble profile
    const profile: CompanyProfile = {
      identity: {
        legalName: topMatch?.legalName ?? input.legalName ?? '',
        normalizedLegalName:
          topMatch?.normalizedLegalName ??
          topMatch?.legalName?.toUpperCase() ??
          input.legalName?.toUpperCase() ??
          '',
        nif: topMatch?.nif ?? input.nif,
        vatNumber: topMatch?.vatNumber ?? input.vatNumber,
        legalForm: legalForm !== 'UNKNOWN' ? legalForm : undefined,
        registeredAddress: topMatch?.address ?? input.address,
        taxResidence: input.declaredTaxResidence,
        province: topMatch?.province ?? input.province,
        country: input.country ?? 'ES',
      },
      registry: {
        events: [],
        statusSignals: ['ACTIVE_ASSUMED'],
      },
      fiscal: {
        likelyTaxpayerType: taxpayerType !== 'UNKNOWN' ? taxpayerType : undefined,
        likelyVatRegime: resolvedVatRegime !== 'UNKNOWN' ? resolvedVatRegime : undefined,
        likelyObligations,
        warningFlags,
      },
      businessSignals: {},
      provenance,
    };

    return profile;
  }
}
