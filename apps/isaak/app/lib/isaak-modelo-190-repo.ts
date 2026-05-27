// C-B8 — Wrapper Prisma del cálculo del 190 (anual).

import { prisma } from './prisma';
import {
  compute190FromLedger,
  type Compute190Output,
  type LedgerEntryFor190,
  type Modelo190Result,
} from './isaak-modelo-190-ledger';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute190ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  persist?: boolean;
  createdBy?: string;
};

export type Compute190ForTenantResult = {
  ok: boolean;
  output: Compute190Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForYear190(
  tenantId: string,
  ejercicio: number,
): Promise<LedgerEntryFor190[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatAmount: unknown;
    entryDate: Date;
    description: string | null;
    counterpartyNif: string | null;
    counterpartyName: string | null;
  };
  const from = `${ejercicio}-01-01`;
  const to = `${ejercicio}-12-31`;
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT doc_type AS "docType", amount, tax_base AS "taxBase",
            vat_amount AS "vatAmount", entry_date AS "entryDate",
            description, counterparty_nif AS "counterpartyNif",
            counterparty_name AS "counterpartyName"
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
    counterpartyNif: r.counterpartyNif,
    counterpartyName: r.counterpartyName,
  }));
}

export async function compute190ForTenant(
  input: Compute190ForTenantInput,
): Promise<Compute190ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skip(input, 'tenant_required'), error: 'tenantId required' };
  }
  try {
    const ledgerRows = await loadLedgerRowsForYear190(input.tenantId, input.ejercicio);
    const output = compute190FromLedger({ ejercicio: input.ejercicio, ledgerRows });
    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }
    const period = `A-${input.ejercicio}`;
    const result = output.result;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '190',
      period,
      status: 'draft',
      amountDeclared: result.totalRetenciones.toFixed(2),
      amountToPay: null,
      amountToRefund: null,
      notes: buildNotesFromResult190(result),
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
  input: Pick<Compute190ForTenantInput, 'ejercicio'>,
  reason: string,
): Compute190Output {
  return { skipped: true, reason, ejercicio: input.ejercicio };
}

export type Submit190Input = {
  tenantId: string;
  ejercicio: number;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit190Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo190Result;
    }
  | { ok: false; error: string; message: string };

export async function submit190ForTenant(input: Submit190Input): Promise<Submit190Result> {
  if (!input.tenantId) return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }
  const computed = await compute190ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    persist: false,
  });
  if (!computed.ok) {
    return { ok: false, error: 'compute_failed', message: computed.error ?? 'No se pudo recomputar el 190.' };
  }
  if (computed.output.skipped) {
    return { ok: false, error: 'compute_skipped', message: `No procede 190: ${computed.output.reason}` };
  }
  const period = `A-${input.ejercicio}`;
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: { tenantId_model_period: { tenantId: input.tenantId, model: '190', period } },
    select: { id: true, status: true },
  });
  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 190 ${input.ejercicio}. Computa primero con persist=true.`,
    };
  }
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '190',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '190',
      ejercicio: result.ejercicio,
      lineas: result.lineas,
      totalBase: result.totalBase,
      totalRetenciones: result.totalRetenciones,
      perceptoresTrabajadores: result.perceptoresTrabajadores,
      perceptoresProfesionales: result.perceptoresProfesionales,
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

export function buildNotesFromResult190(result: Modelo190Result): string {
  const lines = [
    `Borrador 190 (anual) computado por Isaak desde el Ledger.`,
    `Trabajadores (clave A): ${result.perceptoresTrabajadores}`,
    `Profesionales (clave G): ${result.perceptoresProfesionales}`,
    `Total bases: ${result.totalBase.toFixed(2)}€`,
    `Total retenciones practicadas: ${result.totalRetenciones.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
