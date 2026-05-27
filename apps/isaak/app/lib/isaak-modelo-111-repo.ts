// C-B3 — Wrapper Prisma del cálculo del 111.

import { prisma } from './prisma';
import {
  compute111FromLedger,
  quarterRangeISO,
  type Compute111Output,
  type LedgerEntryFor111,
  type Modelo111Result,
} from './isaak-modelo-111-ledger';
import type { Trimestre } from './fiscal-models';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute111ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  persist?: boolean;
  createdBy?: string;
};

export type Compute111ForTenantResult = {
  ok: boolean;
  output: Compute111Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForPeriod111(
  tenantId: string,
  from: string,
  to: string,
): Promise<LedgerEntryFor111[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatAmount: unknown;
    entryDate: Date;
    description: string | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT doc_type AS "docType", amount, tax_base AS "taxBase",
            vat_amount AS "vatAmount", entry_date AS "entryDate",
            description AS "description"
     FROM isaak_ledger_entries
     WHERE tenant_id = $1::uuid
       AND doc_type IN ('invoice_in', 'payroll')
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
  }));
}

export async function compute111ForTenant(
  input: Compute111ForTenantInput,
): Promise<Compute111ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skipResult(input, 'tenant_required'), error: 'tenantId required' };
  }
  const { from, to } = quarterRangeISO(input.ejercicio, input.periodo);
  try {
    const ledgerRows = await loadLedgerRowsForPeriod111(input.tenantId, from, to);
    const output = compute111FromLedger({
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
      model: '111',
      period,
      status: 'draft',
      amountDeclared: result.totalBases.toFixed(2),
      amountToPay: result.resultado > 0 ? result.resultado.toFixed(2) : null,
      amountToRefund: null,
      notes: buildNotesFromResult111(result),
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
  input: Pick<Compute111ForTenantInput, 'ejercicio' | 'periodo'>,
  reason: string,
): Compute111Output {
  return { skipped: true, reason, ejercicio: input.ejercicio, periodo: input.periodo };
}

export type Submit111Input = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit111Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo111Result;
    }
  | { ok: false; error: string; message: string };

export async function submit111ForTenant(input: Submit111Input): Promise<Submit111Result> {
  if (!input.tenantId) return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }
  const computed = await compute111ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
    persist: false,
  });
  if (!computed.ok) {
    return {
      ok: false,
      error: 'compute_failed',
      message: computed.error ?? 'No se pudo recomputar el 111.',
    };
  }
  if (computed.output.skipped) {
    return {
      ok: false,
      error: 'compute_skipped',
      message: `No procede 111: ${computed.output.reason}`,
    };
  }
  const period = `Q${input.periodo[0]}-${input.ejercicio}`;
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: { tenantId_model_period: { tenantId: input.tenantId, model: '111', period } },
    select: { id: true, status: true },
  });
  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 111 ${input.periodo} ${input.ejercicio}. Computa primero con persist=true.`,
    };
  }
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '111',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '111',
      ejercicio: result.ejercicio,
      periodo: result.periodo,
      trabajadores: result.trabajadores,
      profesionales: result.profesionales,
      totalBases: result.totalBases,
      totalRetenciones: result.totalRetenciones,
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

export function buildNotesFromResult111(result: Modelo111Result): string {
  const lines = [
    `Borrador 111 computado por Isaak desde el Ledger.`,
    `Trabajadores: ${result.trabajadores.perceptores} perceptores, bases ${result.trabajadores.basesRetenciones.toFixed(2)}€, retenciones ${result.trabajadores.importeRetenciones.toFixed(2)}€`,
    `Profesionales: ${result.profesionales.perceptores} perceptores, bases ${result.profesionales.basesRetenciones.toFixed(2)}€, retenciones ${result.profesionales.importeRetenciones.toFixed(2)}€`,
    `Total retenciones a ingresar: ${result.totalRetenciones.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
