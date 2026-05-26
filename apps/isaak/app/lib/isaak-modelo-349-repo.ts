// C-B4 — Wrapper Prisma del cálculo del 349.

import { prisma } from './prisma';
import {
  compute349FromLedger,
  quarterRangeISO349,
  type Compute349Output,
  type LedgerEntryFor349,
  type Modelo349Result,
} from './isaak-modelo-349-ledger';
import type { Trimestre } from './fiscal-models';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute349ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  persist?: boolean;
  createdBy?: string;
};

export type Compute349ForTenantResult = {
  ok: boolean;
  output: Compute349Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForPeriod349(
  tenantId: string,
  from: string,
  to: string,
): Promise<LedgerEntryFor349[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatRate: unknown;
    vatAmount: unknown;
    entryDate: Date;
    counterpartyNif: string | null;
    counterpartyName: string | null;
    description: string | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT doc_type AS "docType", amount, tax_base AS "taxBase",
            vat_rate AS "vatRate", vat_amount AS "vatAmount",
            entry_date AS "entryDate",
            counterparty_nif AS "counterpartyNif",
            counterparty_name AS "counterpartyName",
            description AS "description"
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
    counterpartyNif: r.counterpartyNif,
    counterpartyName: r.counterpartyName,
    description: r.description,
  }));
}

export async function compute349ForTenant(
  input: Compute349ForTenantInput,
): Promise<Compute349ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skipResult(input, 'tenant_required'), error: 'tenantId required' };
  }
  const { from, to } = quarterRangeISO349(input.ejercicio, input.periodo);
  try {
    const ledgerRows = await loadLedgerRowsForPeriod349(input.tenantId, from, to);
    const output = compute349FromLedger({
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      ledgerRows,
    });
    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }
    const period = `Q${input.periodo[0]}-${input.ejercicio}`;
    const result = output.result;
    const totalOperaciones = result.totalEntregas + result.totalAdquisiciones;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '349',
      period,
      status: 'draft',
      amountDeclared: totalOperaciones.toFixed(2),
      amountToPay: null, // 349 no es a ingresar (informativo)
      amountToRefund: null,
      notes: buildNotesFromResult349(result),
      createdBy: input.createdBy ?? 'isaak-auto',
    });
    return { ok: true, output, taxReturnId: persisted.id, persistedAsDraft: true };
  } catch (err) {
    return {
      ok: false,
      output: skipResult(input, 'compute_failed'),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function skipResult(
  input: Pick<Compute349ForTenantInput, 'ejercicio' | 'periodo'>,
  reason: string,
): Compute349Output {
  return { skipped: true, reason, ejercicio: input.ejercicio, periodo: input.periodo };
}

export type Submit349Input = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit349Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo349Result;
    }
  | { ok: false; error: string; message: string };

export async function submit349ForTenant(input: Submit349Input): Promise<Submit349Result> {
  if (!input.tenantId) return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }
  const computed = await compute349ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
    persist: false,
  });
  if (!computed.ok) {
    return { ok: false, error: 'compute_failed', message: computed.error ?? 'No se pudo recomputar el 349.' };
  }
  if (computed.output.skipped) {
    return { ok: false, error: 'compute_skipped', message: `No procede 349: ${computed.output.reason}` };
  }
  const period = `Q${input.periodo[0]}-${input.ejercicio}`;
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: { tenantId_model_period: { tenantId: input.tenantId, model: '349', period } },
    select: { id: true, status: true },
  });
  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 349 ${input.periodo} ${input.ejercicio}. Computa primero con persist=true.`,
    };
  }
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '349',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '349',
      ejercicio: result.ejercicio,
      periodo: result.periodo,
      lineas: result.lineas,
      totalEntregas: result.totalEntregas,
      totalAdquisiciones: result.totalAdquisiciones,
      totalOperaciones: result.totalOperaciones,
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

export function buildNotesFromResult349(result: Modelo349Result): string {
  const lines = [
    `Borrador 349 computado por Isaak desde el Ledger.`,
    `Líneas: ${result.lineas.length} (${result.totalOperaciones} operaciones)`,
    `Total entregas (E+S): ${result.totalEntregas.toFixed(2)}€`,
    `Total adquisiciones (A+I): ${result.totalAdquisiciones.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
