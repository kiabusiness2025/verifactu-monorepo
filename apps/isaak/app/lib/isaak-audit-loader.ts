// F11 fase 3 — loader del snapshot de auditoría desde el ledger.
//
// Conecta `aggregateLedgerSnapshot` (pure) con las tablas reales
// (IsaakLedgerEntry, SeAccount, SeTransaction). El resultado se pasa
// directamente a `runAudit` para producir el InspectionReport.
//
// Decisiones de mapeo (en ausencia de tabla IsaakTaxReturn aún):
//   * tax returns: array vacío de momento. Cuando F11 fase 4 / B3 añada
//     IsaakTaxReturn, este loader leerá ahí.
//   * cash balance: 0 por defecto (el ledger F9 no segrega cuentas PGC
//     todavía). Cuando F9 fase 4 separe accounts, se sumará por 570.
//   * pendingAccountsBalance: 0 (idem para 555).
//   * partnersBalance: 0 (idem para 551/552).
//   * unaccountedInvoicesInWithVat: 0 (no hay flujo de OCR sin asentar
//     todavía; F11 fase 4 contará IsaakInvoicePending sin LedgerEntry
//     vinculada).
//   * bank accounts: se leen SeAccount + SeTransaction.reconciledAt
//     para construir `BankAccountSummary` reales hoy.

import { prisma } from './prisma';
import {
  aggregateLedgerSnapshot,
  type LedgerRowForAudit,
  type TaxReturnRowForAudit,
} from './inspector-aeat-audit';
import type {
  AuditLedgerSnapshot,
  BankAccountSummary,
  TaxpayerProfileSnapshot,
} from './inspector-aeat';
import { getTaxpayerProfileAsSnapshot } from './isaak-taxpayer-profile';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type BuildAuditSnapshotInput = {
  tenantId: string;
  periodFrom: string; // 'YYYY-MM-DD'
  periodTo: string;
};

function assertIsoDate(label: string, value: string): void {
  if (!ISO_DATE_REGEX.test(value)) {
    throw new Error(`${label} must be in YYYY-MM-DD format`);
  }
}

export async function loadLedgerRowsForPeriod(
  tenantId: string,
  periodFrom: string,
  periodTo: string
): Promise<LedgerRowForAudit[]> {
  // Filtramos por tenant_id PRIMERO (invariante de aislamiento).
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatAmount: unknown;
    description: string;
    counterpartyNif: string | null;
    entryDate: Date;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       doc_type        AS "docType",
       amount,
       tax_base        AS "taxBase",
       vat_amount      AS "vatAmount",
       description,
       counterparty_nif AS "counterpartyNif",
       entry_date      AS "entryDate"
     FROM isaak_ledger_entries
     WHERE tenant_id = $1::uuid
       AND entry_date >= $2::date
       AND entry_date <= $3::date
     ORDER BY entry_date ASC`,
    tenantId,
    periodFrom,
    periodTo
  );

  return rows.map((r) => ({
    docType: r.docType,
    amount: String(r.amount ?? '0'),
    taxBase: r.taxBase != null ? String(r.taxBase) : null,
    vatAmount: r.vatAmount != null ? String(r.vatAmount) : null,
    description: r.description ?? '',
    counterpartyNif: r.counterpartyNif,
    entryDate: r.entryDate.toISOString().slice(0, 10),
  }));
}

// F11 fase 4 — lee IsaakTaxReturn y devuelve los modelos presentados
// cuyo período fiscal SOLAPA con el rango auditado. Solo se consideran
// los marcados como 'presented' o 'accepted' (los borradores no
// cuentan como "ya declarados" en los cruces).
export async function loadTaxReturnsForPeriod(
  tenantId: string,
  periodFrom: string,
  periodTo: string
): Promise<TaxReturnRowForAudit[]> {
  type Row = {
    model: string;
    period: string;
    amountDeclared: unknown;
    presentedAt: Date | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       model,
       period,
       amount_declared AS "amountDeclared",
       presented_at    AS "presentedAt"
     FROM isaak_tax_returns
     WHERE tenant_id = $1::uuid
       AND status IN ('presented', 'accepted')`,
    tenantId
  );
  // Filtramos en aplicación por solapamiento del período del modelo
  // con el rango auditado. La derivación es trivial (Q1-2026 → enero/marzo)
  // y se reutiliza desde isaak-tax-returns para mantener una sola fuente.
  const { periodOverlapsRange } = await import('./isaak-tax-returns');
  return rows
    .filter((r) => periodOverlapsRange(r.period, periodFrom, periodTo))
    .map((r) => ({
      model: r.model,
      period: r.period,
      amountDeclared: String(r.amountDeclared ?? '0'),
      presentedAt: r.presentedAt ? r.presentedAt.toISOString() : null,
    }));
}

export async function loadBankAccountSummaries(
  tenantId: string
): Promise<BankAccountSummary[]> {
  type Row = {
    id: string;
    name: string;
    iban: string | null;
    balance: unknown;
    lastReconciliationDate: Date | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       a.id,
       a.name,
       a.iban,
       a.balance,
       (SELECT MAX(t.reconciled_at)::date
          FROM se_transactions t
          WHERE t.account_id = a.id
            AND t.tenant_id = $1::uuid
            AND t.reconciled_at IS NOT NULL
       ) AS "lastReconciliationDate"
     FROM se_accounts a
     WHERE a.tenant_id = $1::uuid
       AND a.status = 'active'`,
    tenantId
  );

  return rows.map((r) => ({
    account: r.iban || r.name || r.id,
    balance: String(r.balance ?? '0'),
    lastReconciliationDate: r.lastReconciliationDate
      ? r.lastReconciliationDate.toISOString().slice(0, 10)
      : null,
  }));
}

// Orquestador completo. Lanza todas las consultas en paralelo y
// produce un AuditLedgerSnapshot listo para runAudit().
export async function buildAuditSnapshotForTenant(
  input: BuildAuditSnapshotInput
): Promise<AuditLedgerSnapshot> {
  if (!input.tenantId) throw new Error('buildAuditSnapshotForTenant: tenantId required');
  assertIsoDate('periodFrom', input.periodFrom);
  assertIsoDate('periodTo', input.periodTo);

  const [ledgerRows, taxReturns, bankAccounts] = await Promise.all([
    loadLedgerRowsForPeriod(input.tenantId, input.periodFrom, input.periodTo),
    loadTaxReturnsForPeriod(input.tenantId, input.periodFrom, input.periodTo),
    loadBankAccountSummaries(input.tenantId),
  ]);

  return aggregateLedgerSnapshot({
    ledgerRows,
    taxReturns,
    cashBalance: '0.00',
    partnersBalance: '0.00',
    pendingAccountsBalance: '0.00',
    bankAccounts,
    unaccountedInvoicesInWithVat: 0,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
  });
}

// I7 — orquestador que carga snapshot + perfil fiscal del tenant y los
// devuelve listos para `runAudit({ snapshot, profile })`. Si el tenant
// no tiene perfil R000 completado, devuelve profile=null y el engine
// aplica reglas sin scope (back-compat con tenants pre-wizard).
export async function loadAuditInputsForTenant(
  input: BuildAuditSnapshotInput,
): Promise<{
  snapshot: AuditLedgerSnapshot;
  profile: TaxpayerProfileSnapshot | null;
}> {
  const [snapshot, profile] = await Promise.all([
    buildAuditSnapshotForTenant(input),
    getTaxpayerProfileAsSnapshot(input.tenantId),
  ]);
  return { snapshot, profile };
}
