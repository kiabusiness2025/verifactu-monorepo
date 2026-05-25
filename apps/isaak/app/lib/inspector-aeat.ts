// F11 Inspector AEAT — Capa 1: hardcoded fiscal rules engine.
//
// Cada regla recibe un "contexto de acción fiscal pendiente" (crear
// factura, registrar gasto, pago a Hacienda, etc.) y devuelve si
// aplica + severidad + mensaje + cita normativa.
//
// El engine es PURO: no toca DB ni LLM. Diseño:
//   * Rules son agnósticas de Prisma → testables al 100%
//   * appliesTo soporta dimensiones de scoping: action, taxpayerType,
//     regime IVA, territorio fiscal, sector. Una regla puede aplicarse
//     a "autónomos en régimen común", o "SL en territorio foral", etc.
//   * Cada violación cita normativa (legalBasis estructurado: array de
//     {law, article, url?}). El campo "citation" plano se mantiene
//     compat para consumidores que ya lo leen (bridge tool-loop).
//   * Severidad: error (bloquea), warning (pide confirmación), info
//   * Inyectable: `now` en el contexto para tests deterministas

export type RuleSeverity = 'error' | 'warning' | 'info';

export type RuleCategory =
  | 'iva_deducibilidad'
  | 'iva_repercutido'
  | 'irpf_retenciones'
  | 'sociedades'
  | 'plazos_presentacion'
  | 'contabilidad_pgc'
  | 'verifactu_obligaciones'
  | 'facturacion_electronica'
  | 'operaciones_vinculadas'
  | 'regimenes_especiales'
  | 'tesoreria'
  | 'comercio_exterior'
  | 'laboral_fiscal'
  | 'censos'
  | 'perfil_fiscal';

// ─── Profile dimensions for scoping rules ────────────────────────────────

export type TaxpayerType =
  | 'autonomo'
  | 'sl' // sociedad limitada
  | 'sa' // sociedad anónima
  | 'comunidad_bienes'
  | 'asociacion'
  | 'fundacion';

export type FiscalTerritory =
  | 'comun' // territorio fiscal común (la mayoría)
  | 'canarias' // IGIC en lugar de IVA
  | 'pais_vasco' // foral + TicketBAI
  | 'navarra' // foral
  | 'ceuta_melilla';

export type VatRegime =
  | 'general'
  | 'recargo_equivalencia'
  | 'criterio_caja'
  | 'simplificado'
  | 'prorrata'
  | 'sii'
  | 'exento';

// Pending action context — what is Isaak about to register or change?

export type PendingInvoiceIn = {
  amount: string;
  vatBase?: string | null;
  vatRate?: string | null; // decimal as string, e.g. '21.00'
  vatAmount?: string | null;
  counterpartyNif?: string | null;
  counterpartyName?: string | null;
  description: string;
  paymentMethod?: 'cash' | 'transfer' | 'card' | 'other' | null;
  date: string; // 'YYYY-MM-DD' (de la factura/operación)
  receivedDate?: string | null; // fecha de recepción de la factura (opcional)
};

export type PendingInvoiceOut = PendingInvoiceIn & {
  docType?: 'invoice' | 'simplified' | 'rectificativa';
  series?: string | null;
  docNumber?: string | null;
  emitterNif?: string | null;
  recipientType?: 'b2b' | 'b2c' | null;
  rectifiesDocNumber?: string | null; // si docType=rectificativa
};

export type PendingExpense = PendingInvoiceIn;

export type PendingPayroll = {
  grossAmount: string;
  netAmount: string;
  irpfWithheld?: string | null;
  socialSecurityEmployee?: string | null;
  employeeNif?: string | null;
  period: string; // 'YYYY-MM'
  role?: 'employee' | 'administrator' | 'professional_self_employed' | null;
};

export type PendingTaxPayment = {
  model: '303' | '130' | '111' | '115' | '180' | '347' | '349' | '390' | '720' | '100' | '200' | '202';
  period: string; // e.g. 'Q1-2026', 'M03-2026', 'A-2025'
  amount: string;
};

export type PendingJournal = {
  description: string;
  amount: string;
  accountDebit?: string | null;
  accountCredit?: string | null;
};

export type PendingProfileCheck = {
  // R000 — runs only when the orchestrator wants to verify the tenant
  // profile has the required data to run the rest of the rules.
  reason: 'onboarding' | 'pre_action' | 'admin_review';
};

export type RuleContextBase = {
  now?: Date;
  // Optional taxpayer profile. When present, rules can scope themselves
  // (e.g. solo aplicable a autónomos, solo a IGIC, etc.). When absent,
  // every rule applies to every action (back-compat with fase 1).
  profile?: TaxpayerProfileSnapshot | null;
};

export type RuleContext = RuleContextBase &
  (
    | { action: 'invoice_in'; data: PendingInvoiceIn }
    | { action: 'invoice_out'; data: PendingInvoiceOut }
    | { action: 'expense'; data: PendingExpense }
    | { action: 'payroll'; data: PendingPayroll }
    | { action: 'tax_payment'; data: PendingTaxPayment }
    | { action: 'journal'; data: PendingJournal }
    | { action: 'profile_check'; data: PendingProfileCheck }
  );

// Snapshot of the taxpayer profile passed to the engine. The full
// profile evaluation (R000) lives in `inspector-aeat-profile.ts`.
export type TaxpayerProfileSnapshot = {
  taxpayerType?: TaxpayerType | null;
  territory?: FiscalTerritory | null;
  vatRegime?: VatRegime | null;
  corporateTaxSubject?: boolean | null;
  hasEmployees?: boolean | null;
  hasRentWithholding?: boolean | null;
  hasProfessionalInvoices?: boolean | null;
  hasIntraEUOperations?: boolean | null;
  hasRelatedParties?: boolean | null;
  usesBillingSoftware?: boolean | null;
  annualTurnover?: number | null;
  sector?: string | null;
};

// ─── Legal basis & rule eval results ────────────────────────────────────

export type LegalBasis = {
  law: string; // e.g. 'LIVA' (Ley 37/1992)
  article: string; // e.g. 'Art. 96.Uno.5º' or 'Art. 7.Uno.1'
  url?: string; // canonical BOE / AEAT URL
};

export type RuleEvaluation =
  | { applies: false }
  | {
      applies: true;
      severity: RuleSeverity;
      message: string; // user-facing, Spanish
      // citation se deriva de legalBasis[0] cuando se omite — se mantiene
      // como string plano para consumidores que ya lo leen (bridge).
      citation?: string;
      legalBasis?: ReadonlyArray<LegalBasis>;
      recommendation?: string;
      evidenceRequired?: ReadonlyArray<string>;
      suggestedAction?: string;
    };

// appliesTo extendido — define el ámbito de la regla. La regla se
// evaluará solo si:
//   * la acción pertenece a appliesTo.actions
//   * (si el perfil está presente) sus dimensiones coinciden con las
//     restricciones declaradas (taxpayerType/regime/territory/sector)
// Cuando no hay perfil, se aplican solo los filtros por acción.
export type RuleScope = {
  actions: ReadonlyArray<RuleContext['action']>;
  taxpayerType?: ReadonlyArray<TaxpayerType>;
  regime?: ReadonlyArray<VatRegime>;
  territory?: ReadonlyArray<FiscalTerritory>;
  sector?: ReadonlyArray<string>;
};

export type AeatRule = {
  id: string; // 'R001', 'R002', ...
  category: RuleCategory;
  description: string; // internal, for docs/admin UI
  appliesTo: RuleScope;
  check: (ctx: RuleContext) => RuleEvaluation;
};

export type RuleViolation = {
  ruleId: string;
  severity: RuleSeverity;
  category: RuleCategory;
  message: string;
  citation: string;
  legalBasis?: ReadonlyArray<LegalBasis>;
  recommendation?: string;
  evidenceRequired?: ReadonlyArray<string>;
  suggestedAction?: string;
};

export type InspectionReport = {
  errors: RuleViolation[];
  warnings: RuleViolation[];
  infos: RuleViolation[];
  passed: boolean; // true if no errors
  evaluatedRuleIds: string[]; // every rule considered for this context
  skippedByScope: string[]; // rules pinned by profile mismatch (debug)
};

// ─── Helpers (decimal-safe comparisons, keyword matching) ────────────────

export function decimalGT(a: string, b: string): boolean {
  return Number.parseFloat(a) > Number.parseFloat(b);
}

export function decimalGTE(a: string, b: string): boolean {
  return Number.parseFloat(a) >= Number.parseFloat(b);
}

export function decimalEquals(a: string, b: string): boolean {
  return Math.abs(Number.parseFloat(a) - Number.parseFloat(b)) < 0.005;
}

// Removes accents and lowercases — used for keyword matching against the
// user's free-text descriptions.
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function descriptionContainsAny(
  description: string,
  needles: ReadonlyArray<string>
): boolean {
  const norm = normalizeText(description);
  for (const n of needles) {
    if (norm.includes(normalizeText(n))) return true;
  }
  return false;
}

// Composes a flat "citation" string from a legalBasis array. Used to
// keep backward-compat with consumers that read RuleViolation.citation
// directly (the tool-loop bridge).
export function formatLegalBasis(basis: ReadonlyArray<LegalBasis>): string {
  return basis.map((b) => `${b.article} ${b.law}`).join(' + ');
}

// Returns true if the rule's scope is compatible with the (optional)
// profile. When a dimension is unconstrained in the rule (no array
// declared), it matches anything. When constrained but profile lacks
// the dimension, we conservatively MATCH (better surface a warning the
// user can dismiss than skip silently).
function profileMatchesScope(
  scope: RuleScope,
  profile: TaxpayerProfileSnapshot | null | undefined
): boolean {
  if (!profile) return true; // back-compat: sin perfil, aplica
  if (
    scope.taxpayerType &&
    profile.taxpayerType &&
    !scope.taxpayerType.includes(profile.taxpayerType)
  ) {
    return false;
  }
  if (
    scope.regime &&
    profile.vatRegime &&
    !scope.regime.includes(profile.vatRegime)
  ) {
    return false;
  }
  if (
    scope.territory &&
    profile.territory &&
    !scope.territory.includes(profile.territory)
  ) {
    return false;
  }
  if (
    scope.sector &&
    profile.sector &&
    !scope.sector.includes(profile.sector)
  ) {
    return false;
  }
  return true;
}

// ─── Engine ──────────────────────────────────────────────────────────────

export function evaluateContext(
  rules: ReadonlyArray<AeatRule>,
  ctx: RuleContext
): InspectionReport {
  const errors: RuleViolation[] = [];
  const warnings: RuleViolation[] = [];
  const infos: RuleViolation[] = [];
  const evaluatedRuleIds: string[] = [];
  const skippedByScope: string[] = [];

  for (const rule of rules) {
    if (!rule.appliesTo.actions.includes(ctx.action)) continue;
    if (!profileMatchesScope(rule.appliesTo, ctx.profile)) {
      skippedByScope.push(rule.id);
      continue;
    }
    evaluatedRuleIds.push(rule.id);
    const result = rule.check(ctx);
    if (!result.applies) continue;

    const legalBasis = result.legalBasis;
    const citation =
      result.citation ??
      (legalBasis && legalBasis.length > 0
        ? formatLegalBasis(legalBasis)
        : 'Normativa AEAT');

    const violation: RuleViolation = {
      ruleId: rule.id,
      severity: result.severity,
      category: rule.category,
      message: result.message,
      citation,
      legalBasis,
      recommendation: result.recommendation,
      evidenceRequired: result.evidenceRequired,
      suggestedAction: result.suggestedAction,
    };
    if (result.severity === 'error') errors.push(violation);
    else if (result.severity === 'warning') warnings.push(violation);
    else infos.push(violation);
  }

  return {
    errors,
    warnings,
    infos,
    passed: errors.length === 0,
    evaluatedRuleIds,
    skippedByScope,
  };
}
