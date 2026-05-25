// F11 Inspector AEAT — Capa 1: hardcoded fiscal rules engine.
//
// Cada regla recibe un "contexto de acción fiscal pendiente" (crear
// factura, registrar gasto, pago a Hacienda, etc.) y devuelve si
// aplica + severidad + mensaje + cita normativa.
//
// El engine es PURO: no toca DB ni LLM. La integración con el
// tool-loop (bloqueo de writes con errors, confirmación con warnings)
// se hace en F11 fase 2.
//
// Diseño:
//   * Rules son agnósticas de Prisma → testables al 100%
//   * Cada regla cita el artículo o RD aplicable
//   * Severidad: error (bloquea), warning (pide confirmación), info
//   * Inyectable: `now` en el contexto para tests deterministas

export type RuleSeverity = 'error' | 'warning' | 'info';

export type RuleCategory =
  | 'iva_deducibilidad'
  | 'irpf_retenciones'
  | 'plazos_presentacion'
  | 'contabilidad_pgc'
  | 'verifactu_obligaciones'
  | 'facturacion_electronica'
  | 'operaciones_vinculadas'
  | 'regimenes_especiales';

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
  date: string; // 'YYYY-MM-DD'
};

export type PendingInvoiceOut = PendingInvoiceIn & { docType?: 'invoice' | 'simplified' };

export type PendingExpense = PendingInvoiceIn;

export type PendingPayroll = {
  grossAmount: string;
  netAmount: string;
  irpfWithheld?: string | null;
  socialSecurityEmployee?: string | null;
  employeeNif?: string | null;
  period: string; // 'YYYY-MM'
};

export type PendingTaxPayment = {
  model: '303' | '130' | '111' | '115' | '180' | '347' | '349' | '390' | '720' | '100' | '200';
  period: string; // e.g. 'Q1-2026', 'M03-2026', 'A-2025'
  amount: string;
};

export type PendingJournal = {
  description: string;
  amount: string;
  accountDebit?: string | null;
  accountCredit?: string | null;
};

export type RuleContext =
  | { action: 'invoice_in'; data: PendingInvoiceIn; now?: Date }
  | { action: 'invoice_out'; data: PendingInvoiceOut; now?: Date }
  | { action: 'expense'; data: PendingExpense; now?: Date }
  | { action: 'payroll'; data: PendingPayroll; now?: Date }
  | { action: 'tax_payment'; data: PendingTaxPayment; now?: Date }
  | { action: 'journal'; data: PendingJournal; now?: Date };

export type RuleEvaluation =
  | { applies: false }
  | {
      applies: true;
      severity: RuleSeverity;
      message: string; // user-facing, Spanish
      citation: string; // legal cite, e.g. 'Art. 96.1.5 LIVA'
      suggestedAction?: string;
    };

export type AeatRule = {
  id: string; // 'R001', 'R002', ...
  category: RuleCategory;
  description: string; // internal, for docs/admin UI
  appliesTo: ReadonlyArray<RuleContext['action']>;
  check: (ctx: RuleContext) => RuleEvaluation;
};

export type RuleViolation = {
  ruleId: string;
  severity: RuleSeverity;
  category: RuleCategory;
  message: string;
  citation: string;
  suggestedAction?: string;
};

export type InspectionReport = {
  errors: RuleViolation[];
  warnings: RuleViolation[];
  infos: RuleViolation[];
  passed: boolean; // true if no errors
  evaluatedRuleIds: string[]; // every rule that was considered for this context
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

// ─── Engine ──────────────────────────────────────────────────────────────

export function evaluateContext(
  rules: ReadonlyArray<AeatRule>,
  ctx: RuleContext
): InspectionReport {
  const errors: RuleViolation[] = [];
  const warnings: RuleViolation[] = [];
  const infos: RuleViolation[] = [];
  const evaluatedRuleIds: string[] = [];

  for (const rule of rules) {
    if (!rule.appliesTo.includes(ctx.action)) continue;
    evaluatedRuleIds.push(rule.id);
    const result = rule.check(ctx);
    if (!result.applies) continue;
    const violation: RuleViolation = {
      ruleId: rule.id,
      severity: result.severity,
      category: rule.category,
      message: result.message,
      citation: result.citation,
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
  };
}
