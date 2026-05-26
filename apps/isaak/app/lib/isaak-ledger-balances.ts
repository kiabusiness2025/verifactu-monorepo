// L4-L5 — Saldos por cuenta PGC desde el Isaak Ledger.
//
// Pure SQL builder + helpers de clasificación PGC. La función que
// ejecuta la query vive en isaak-ledger-balances-repo (con Prisma).
//
// Convención de signo (partida doble):
//   * Si una entrada tiene accountDebit = X, suma +amount al saldo de X.
//   * Si una entrada tiene accountCredit = X, suma -amount al saldo de X.
//   * Balance = sum(signed amounts).
//
// Significado por tipo de cuenta:
//   * Activo (1xx-5xx, ej. caja 570, bancos 572): balance positivo = sano.
//     Negativo = anomalía (R129 caja negativa).
//   * Pasivo / Patrimonio (1xx-4xx según subgrupo): balance negativo
//     significa "obligación" (la empresa debe), es lo normal.
//   * Ingreso (7xx): balance negativo = ingresos del periodo.
//   * Gasto (6xx): balance positivo = gastos del periodo.

// ─── Clasificación PGC ─────────────────────────────────────────────────

// Caja: cuenta 570 (caja, euros) + 571 (caja, moneda extranjera)
const CASH_PREFIXES: ReadonlyArray<string> = ['570', '571'];

// Bancos: 572 (cuentas en bancos e instituciones de crédito euros) y
// 573, 574 (otras monedas / depósitos a corto). Cubre la sección
// "Tesorería" 57x salvo caja.
const BANK_PREFIXES: ReadonlyArray<string> = ['572', '573', '574'];

// Socios y administradores: 551 (cuenta corriente con socios y
// administradores) + 552 (cuenta corriente con otras partes vinculadas).
const PARTNER_PREFIXES: ReadonlyArray<string> = ['551', '552'];

// Partidas pendientes de aplicación: cuenta 555 puro.
const PENDING_PREFIXES: ReadonlyArray<string> = ['555'];

export type AccountKind = 'cash' | 'bank' | 'partner' | 'pending' | 'other';

function startsWithAny(code: string, prefixes: ReadonlyArray<string>): boolean {
  return prefixes.some((p) => code.startsWith(p));
}

export function isCashAccount(code: string): boolean {
  return startsWithAny(code, CASH_PREFIXES);
}
export function isBankAccount(code: string): boolean {
  return startsWithAny(code, BANK_PREFIXES);
}
export function isPartnerAccount(code: string): boolean {
  return startsWithAny(code, PARTNER_PREFIXES);
}
export function isPendingAccount(code: string): boolean {
  return startsWithAny(code, PENDING_PREFIXES);
}

export function classifyAccount(code: string): AccountKind {
  if (isCashAccount(code)) return 'cash';
  if (isBankAccount(code)) return 'bank';
  if (isPartnerAccount(code)) return 'partner';
  if (isPendingAccount(code)) return 'pending';
  return 'other';
}

// ─── SQL ───────────────────────────────────────────────────────────────

// Devuelve balance + totales debe/haber por cada cuenta usada por el
// tenant hasta `periodEnd` (inclusive) o sin tope si se pasa null.
//
// Parámetros:
//   $1 = tenantId (UUID)
//   $2 = periodEnd ('YYYY-MM-DD') si applyEnd=true, ignorado si no.
export function buildAccountBalancesSQL(opts: { applyEnd: boolean }): string {
  const endClause = opts.applyEnd ? 'AND entry_date <= $2::date' : '';
  return `
    WITH ledger_lines AS (
      SELECT
        account_debit  AS account,
        amount         AS signed_amount,
        amount         AS debit_amount,
        0::numeric     AS credit_amount
      FROM isaak_ledger_entries
      WHERE tenant_id = $1::uuid
        AND account_debit IS NOT NULL
        ${endClause}
      UNION ALL
      SELECT
        account_credit AS account,
        -amount        AS signed_amount,
        0::numeric     AS debit_amount,
        amount         AS credit_amount
      FROM isaak_ledger_entries
      WHERE tenant_id = $1::uuid
        AND account_credit IS NOT NULL
        ${endClause}
    )
    SELECT
      account,
      SUM(signed_amount)::text AS "balance",
      SUM(debit_amount)::text  AS "totalDebits",
      SUM(credit_amount)::text AS "totalCredits"
    FROM ledger_lines
    GROUP BY account
    ORDER BY account
  `.trim();
}

// ─── Tipos del resultado ──────────────────────────────────────────────

export type AccountBalance = {
  account: string;
  kind: AccountKind;
  balance: string; // signed decimal as string
  totalDebits: string;
  totalCredits: string;
};

// Agregados que el `AuditLedgerSnapshot` espera. La caja y partidas
// pendientes se computan sumando todas las subcuentas del tipo
// correspondiente. El saldo "partners" suma todas las 551/552 (los
// saldos pueden ser de socios distintos pero el chequeo agregado es el
// que disparan las reglas).
export type AuditBalanceAggregates = {
  cashBalance: string;
  partnersBalance: string;
  pendingAccountsBalance: string;
  // Bancos los seguimos leyendo desde se_accounts (Enable Banking) cuando
  // el tenant tiene PSD2 conectado; este campo expone el agregado PGC
  // para tenants que sí tienen 57x en el Ledger pero no PSD2.
  pgcBankBalance: string;
};

function sumDecimals(values: ReadonlyArray<string>): number {
  let s = 0;
  for (const v of values) {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) s += n;
  }
  return s;
}

export function aggregateBalancesForAudit(
  balances: ReadonlyArray<AccountBalance>,
): AuditBalanceAggregates {
  const byKind: Record<AccountKind, string[]> = {
    cash: [],
    bank: [],
    partner: [],
    pending: [],
    other: [],
  };
  for (const b of balances) {
    byKind[b.kind].push(b.balance);
  }
  return {
    cashBalance: sumDecimals(byKind.cash).toFixed(2),
    partnersBalance: sumDecimals(byKind.partner).toFixed(2),
    pendingAccountsBalance: sumDecimals(byKind.pending).toFixed(2),
    pgcBankBalance: sumDecimals(byKind.bank).toFixed(2),
  };
}

// Enriquecimiento: clasifica cada cuenta del resultado raw del SQL.
export function classifyBalances(
  raw: ReadonlyArray<{
    account: string;
    balance: string;
    totalDebits: string;
    totalCredits: string;
  }>,
): AccountBalance[] {
  return raw.map((r) => ({
    account: r.account,
    kind: classifyAccount(r.account),
    balance: r.balance,
    totalDebits: r.totalDebits,
    totalCredits: r.totalCredits,
  }));
}
