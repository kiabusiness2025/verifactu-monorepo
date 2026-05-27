// C-B6 — Wrapper Prisma del cálculo del 115.

import { prisma } from './prisma';
import {
  compute115FromLedger,
  quarterRangeISO115,
  type Compute115Output,
  type LedgerEntryFor115,
  type Modelo115Result,
} from './isaak-modelo-115-ledger';
import type { Trimestre } from './fiscal-models';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute115ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  persist?: boolean;
  createdBy?: string;
};

export type Compute115ForTenantResult = {
  ok: boolean;
  output: Compute115Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForPeriod115(
  tenantId: string,
  from: string,
  to: string,
): Promise<LedgerEntryFor115[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatAmount: unknown;
    entryDate: Date;
    description: string | null;
    accountDebit: string | null;
    counterpartyNif: string | null;
    counterpartyName: string | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT doc_type AS "docType", amount, tax_base AS "taxBase",
            vat_amount AS "vatAmount", entry_date AS "entryDate",
            description, account_debit AS "accountDebit",
            counterparty_nif AS "counterpartyNif",
            counterparty_name AS "counterpartyName"
     FROM isaak_ledger_entries
     WHERE tenant_id = $1::uuid
       AND doc_type IN ('invoice_in', 'expense')
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
    vatAmount: r.vatAmount != null ? String(r.vatAmount) : null,
    entryDate: r.entryDate.toISOString().slice(0, 10),
    description: r.description,
    accountDebit: r.accountDebit,
    counterpartyNif: r.counterpartyNif,
    counterpartyName: r.counterpartyName,
  }));
}

export async function compute115ForTenant(
  input: Compute115ForTenantInput,
): Promise<Compute115ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skip(input, 'tenant_required'), error: 'tenantId required' };
  }
  const { from, to } = quarterRangeISO115(input.ejercicio, input.periodo);
  try {
    const ledgerRows = await loadLedgerRowsForPeriod115(input.tenantId, from, to);
    const output = compute115FromLedger({
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      ledgerRows,
    });
    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }
    const period = `Q${input.periodo[0]}-${input.ejercicio}`;
    const result = output.result;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '115',
      period,
      status: 'draft',
      amountDeclared: result.basesRetenciones.toFixed(2),
      amountToPay: result.resultado > 0 ? result.resultado.toFixed(2) : null,
      amountToRefund: null,
      notes: buildNotesFromResult115(result),
      createdBy: input.createdBy ?? 'isaak-auto',
    });
    return { ok: true, output, taxReturnId: persisted.id, persistedAsDraft: true };
  } catch (err) {
    return {
      ok: false,
      output: skip(input, 'compute_failed'),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function skip(
  input: Pick<Compute115ForTenantInput, 'ejercicio' | 'periodo'>,
  reason: string,
): Compute115Output {
  return { skipped: true, reason, ejercicio: input.ejercicio, periodo: input.periodo };
}

export type Submit115Input = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit115Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo115Result;
    }
  | { ok: false; error: string; message: string };

export async function submit115ForTenant(input: Submit115Input): Promise<Submit115Result> {
  if (!input.tenantId) return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }
  const computed = await compute115ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
    persist: false,
  });
  if (!computed.ok) {
    return { ok: false, error: 'compute_failed', message: computed.error ?? 'No se pudo recomputar el 115.' };
  }
  if (computed.output.skipped) {
    return { ok: false, error: 'compute_skipped', message: `No procede 115: ${computed.output.reason}` };
  }
  const period = `Q${input.periodo[0]}-${input.ejercicio}`;
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: { tenantId_model_period: { tenantId: input.tenantId, model: '115', period } },
    select: { id: true, status: true },
  });
  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 115 ${input.periodo} ${input.ejercicio}. Computa primero con persist=true.`,
    };
  }
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '115',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '115',
      ejercicio: result.ejercicio,
      periodo: result.periodo,
      arrendadores: result.arrendadores,
      basesRetenciones: result.basesRetenciones,
      importeRetenciones: result.importeRetenciones,
      resultado: result.resultado,
      advertencias: result.advertencias,
    },
  });
  if (!submissionResult.ok) {
    return { ok: false, error: submissionResult.error, message: submissionResult.message };
  }
  return {
    ok: true,
    submissionId: submissionResult.submissionId,
    taxReturnId: existingDraft.id,
    payloadHash: submissionResult.payloadHash,
    result,
  };
}

export function buildNotesFromResult115(result: Modelo115Result): string {
  const lines = [
    `Borrador 115 computado por Isaak desde el Ledger.`,
    `Arrendadores: ${result.arrendadores}`,
    `Bases retención: ${result.basesRetenciones.toFixed(2)}€`,
    `Importe retenciones: ${result.importeRetenciones.toFixed(2)}€`,
    `Resultado a ingresar: ${result.resultado.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
