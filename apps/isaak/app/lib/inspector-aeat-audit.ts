// F11 fase 2c — Audit runner + snapshot builder.
//
// El motor del Inspector ya es PURO; este módulo lo conecta al ledger
// real (IsaakLedgerEntry) construyendo `AuditLedgerSnapshot` para un
// tenant + periodo. Los tests para el builder usan un Prisma stub
// (no real DB), de modo que la lógica de agregación es testeable.
//
// Reglas evaluadas:
//   * AEAT_RULES con action='audit' (cross-cutting de fase 2c)
//   * + R000 si el contexto incluye 'profile_check' (no aquí)
//
// El audit es ON-DEMAND: lo dispara la admin UI, un cron mensual o el
// LLM (vía tool `isaak_audit_ledger`) en F11 fase 3.

import type {
  AeatRule,
  AuditLedgerSnapshot,
  BankAccountSummary,
  InspectionReport,
  PresentedTaxModel,
  RuleContext,
  TaxpayerProfileSnapshot,
} from './inspector-aeat';
import { evaluateContext } from './inspector-aeat';
import { AUDIT_RULES } from './inspector-aeat-audit-rules';
import { AEAT_RULES } from './inspector-aeat-rules';

export type AuditRunInput = {
  scope: 'monthly_close' | 'quarterly_close' | 'annual_close' | 'on_demand';
  snapshot: AuditLedgerSnapshot;
  profile?: TaxpayerProfileSnapshot | null;
  now?: Date;
};

// runAudit corre el subset audit-time del catálogo. El registro de
// AEAT_RULES ya contiene las reglas de acción individual y no se
// duplican aquí porque appliesTo.actions las excluye automáticamente
// del contexto 'audit'.
export function runAudit(input: AuditRunInput): InspectionReport {
  const ctx: RuleContext = {
    action: 'audit',
    data: { scope: input.scope, snapshot: input.snapshot },
    profile: input.profile ?? null,
    now: input.now,
  };
  return evaluateContext(AUDIT_RULES, ctx);
}

// Helper para correr AUDIT_RULES junto al catálogo principal (cuando un
// consumidor pasa rules custom o quiere "todas las reglas posibles").
export function runAuditWithAllRules(input: AuditRunInput): InspectionReport {
  const ctx: RuleContext = {
    action: 'audit',
    data: { scope: input.scope, snapshot: input.snapshot },
    profile: input.profile ?? null,
    now: input.now,
  };
  // Concat AEAT_RULES + AUDIT_RULES. La regla de scope filtrará lo no
  // pertinente automáticamente.
  const combined: ReadonlyArray<AeatRule> = [...AEAT_RULES, ...AUDIT_RULES];
  return evaluateContext(combined, ctx);
}

// ─── Snapshot builder (consume el ledger vía Prisma) ────────────────────

export type LedgerRowForAudit = {
  docType: string;
  amount: string;
  taxBase: string | null;
  vatAmount: string | null;
  description: string;
  counterpartyNif: string | null;
  entryDate: string;
};

export type TaxReturnRowForAudit = {
  model: string;
  period: string;
  amountDeclared: string;
  presentedAt: string | null;
};

export type AuditAggregateInput = {
  ledgerRows: ReadonlyArray<LedgerRowForAudit>;
  taxReturns: ReadonlyArray<TaxReturnRowForAudit>;
  cashBalance: string;
  partnersBalance: string;
  pendingAccountsBalance: string;
  bankAccounts: ReadonlyArray<BankAccountSummary>;
  unaccountedInvoicesInWithVat: number;
  periodFrom: string;
  periodTo: string;
};

// Agrega filas del ledger en un AuditLedgerSnapshot. Tests cubren los
// cálculos sin necesidad de Prisma real.
export function aggregateLedgerSnapshot(
  input: AuditAggregateInput
): AuditLedgerSnapshot {
  let vatRepercutido = 0;
  let vatSoportado = 0;
  let retentionsProfessionals = 0;
  let retentionsLandlords = 0;
  let retentionsEmployees = 0;
  let intracomCount = 0;

  for (const row of input.ledgerRows) {
    const vat = row.vatAmount ? Number.parseFloat(row.vatAmount) : 0;
    const desc = (row.description ?? '').toLowerCase();

    if (row.docType === 'invoice_out' && Number.isFinite(vat)) {
      vatRepercutido += vat;
    }
    if (row.docType === 'invoice_in' && Number.isFinite(vat)) {
      vatSoportado += vat;
    }

    // Heurística de retenciones — el ledger no las desagrega en F9, así
    // que se infieren de la descripción + tipo. Cuando F9 fase 4 añada
    // un campo `retencionAmount` se ajustará a leerlo directamente.
    if (row.docType === 'invoice_in' || row.docType === 'expense') {
      const amount = Number.parseFloat(row.amount);
      if (Number.isFinite(amount) && row.taxBase) {
        const base = Number.parseFloat(row.taxBase);
        const vatA = vat;
        // Si total < base + IVA, la diferencia razonable es retención
        const grossWithVat = base + vatA;
        const gap = grossWithVat - amount;
        if (gap > 0) {
          if (/alquiler|arrendamiento/.test(desc)) {
            retentionsLandlords += gap;
          } else if (/honorarios|profesional|abogado|asesor|gestor|consultor|notario|arquitect/.test(desc)) {
            retentionsProfessionals += gap;
          }
        }
      }
    }
    if (row.docType === 'payroll') {
      const amount = Number.parseFloat(row.amount);
      if (row.taxBase) {
        const base = Number.parseFloat(row.taxBase);
        if (Number.isFinite(amount) && Number.isFinite(base) && base > amount) {
          retentionsEmployees += base - amount;
        }
      }
    }

    if (/intracomunitar/.test(desc)) {
      intracomCount += 1;
    }
  }

  const presentedModels: PresentedTaxModel[] = input.taxReturns.map((t) => ({
    model: t.model,
    period: t.period,
    amountDeclared: t.amountDeclared,
    presentedAt: t.presentedAt,
  }));

  return {
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    vatRepercutidoTotal: vatRepercutido.toFixed(2),
    vatSoportadoTotal: vatSoportado.toFixed(2),
    retentionsToProfessionals: retentionsProfessionals.toFixed(2),
    retentionsToLandlords: retentionsLandlords.toFixed(2),
    retentionsToEmployees: retentionsEmployees.toFixed(2),
    intracomOperationsCount: intracomCount,
    presentedModels,
    cashBalance: input.cashBalance,
    partnersBalance: input.partnersBalance,
    pendingAccountsBalance: input.pendingAccountsBalance,
    bankAccounts: input.bankAccounts,
    unaccountedInvoicesInWithVat: input.unaccountedInvoicesInWithVat,
  };
}
