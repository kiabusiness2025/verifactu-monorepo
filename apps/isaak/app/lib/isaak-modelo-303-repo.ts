// C-B1 — Wrapper Prisma del cálculo del 303.
//
// Carga las filas del Ledger del periodo + el perfil fiscal + (si
// existe) el draft previo, ejecuta el cálculo puro y opcionalmente
// persiste como IsaakTaxReturn con status='draft'.

import { prisma } from './prisma';
import {
  compute303FromLedger,
  quarterRangeISO,
  type Compute303Output,
  type LedgerEntryFor303,
} from './isaak-modelo-303-ledger';
import { getTaxpayerProfileAsSnapshot } from './isaak-taxpayer-profile';
import type { Trimestre, Modelo303Result } from './fiscal-models';
import { upsertTaxReturn } from './isaak-tax-returns';

export type Compute303ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  // Si true, persiste el borrador en IsaakTaxReturn (status='draft').
  // Si false (default), solo computa y devuelve el resultado.
  persist?: boolean;
  createdBy?: string;
};

export type Compute303ForTenantResult = {
  ok: boolean;
  output: Compute303Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForPeriod(
  tenantId: string,
  from: string,
  to: string,
): Promise<LedgerEntryFor303[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatRate: unknown;
    vatAmount: unknown;
    entryDate: Date;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       doc_type    AS "docType",
       amount,
       tax_base    AS "taxBase",
       vat_rate    AS "vatRate",
       vat_amount  AS "vatAmount",
       entry_date  AS "entryDate"
     FROM isaak_ledger_entries
     WHERE tenant_id = $1::uuid
       AND doc_type IN ('invoice_out', 'invoice_in', 'expense')
       AND entry_date >= $2::date
       AND entry_date <= $3::date`,
    tenantId,
    from,
    to,
  );
  return rows.map((r) => ({
    docType: r.docType,
    amount: r.amount != null ? String(r.amount) : '0',
    taxBase: r.taxBase != null ? String(r.taxBase) : null,
    vatRate: r.vatRate != null ? String(r.vatRate) : null,
    vatAmount: r.vatAmount != null ? String(r.vatAmount) : null,
    entryDate: r.entryDate.toISOString().slice(0, 10),
  }));
}

export async function compute303ForTenant(
  input: Compute303ForTenantInput,
): Promise<Compute303ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skipResult(input, 'tenant_required'), error: 'tenantId required' };
  }

  const { from, to } = quarterRangeISO(input.ejercicio, input.periodo);

  try {
    const [ledgerRows, profile] = await Promise.all([
      loadLedgerRowsForPeriod(input.tenantId, from, to),
      getTaxpayerProfileAsSnapshot(input.tenantId),
    ]);

    const output = compute303FromLedger({
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      ledgerRows,
      profile,
    });

    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }

    // Persistir como IsaakTaxReturn (status='draft')
    const period = `Q${input.periodo[0]}-${input.ejercicio}`;
    const result = output.result;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '303',
      period,
      status: 'draft',
      amountDeclared: result.totalDevengado.toFixed(2),
      amountToPay: result.resultado > 0 ? result.resultado.toFixed(2) : null,
      amountToRefund: result.resultado < 0 ? Math.abs(result.resultado).toFixed(2) : null,
      notes: buildNotesFromResult(result),
      createdBy: input.createdBy ?? 'isaak-auto',
    });

    return {
      ok: true,
      output,
      taxReturnId: persisted.id,
      persistedAsDraft: true,
    };
  } catch (err) {
    return {
      ok: false,
      output: skipResult(input, 'compute_failed'),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function skipResult(
  input: Pick<Compute303ForTenantInput, 'ejercicio' | 'periodo'>,
  reason: string,
): Compute303Output {
  return {
    skipped: true,
    reason,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
  };
}

export function buildNotesFromResult(result: Modelo303Result): string {
  const lines: string[] = [
    `Borrador 303 computado por Isaak desde el Ledger.`,
    `Facturas emitidas en periodo: ${result.facturas}`,
    `Compras/gastos en periodo: ${result.compras}`,
    `IVA devengado: ${result.totalDevengado.toFixed(2)}€`,
    `IVA soportado: ${result.totalSoportado.toFixed(2)}€`,
    `Resultado: ${result.resultado.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) {
      lines.push(`- ${a}`);
    }
  }
  return lines.join('\n');
}
