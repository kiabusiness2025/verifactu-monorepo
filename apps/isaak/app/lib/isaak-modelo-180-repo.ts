// C-B7 — Wrapper Prisma del cálculo del 180 (anual).

import { prisma } from './prisma';
import {
  compute180FromLedger,
  type Compute180Output,
  type LedgerEntryFor180,
  type Modelo180Result,
} from './isaak-modelo-180-ledger';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute180ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  persist?: boolean;
  createdBy?: string;
};

export type Compute180ForTenantResult = {
  ok: boolean;
  output: Compute180Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForYear180(
  tenantId: string,
  ejercicio: number,
): Promise<LedgerEntryFor180[]> {
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
  const from = `${ejercicio}-01-01`;
  const to = `${ejercicio}-12-31`;
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

export async function compute180ForTenant(
  input: Compute180ForTenantInput,
): Promise<Compute180ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skip(input, 'tenant_required'), error: 'tenantId required' };
  }
  try {
    const ledgerRows = await loadLedgerRowsForYear180(input.tenantId, input.ejercicio);
    const output = compute180FromLedger({ ejercicio: input.ejercicio, ledgerRows });
    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }
    const period = `A-${input.ejercicio}`;
    const result = output.result;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '180',
      period,
      status: 'draft',
      amountDeclared: result.totalRetenciones.toFixed(2),
      amountToPay: null,
      amountToRefund: null,
      notes: buildNotesFromResult180(result),
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
  input: Pick<Compute180ForTenantInput, 'ejercicio'>,
  reason: string,
): Compute180Output {
  return { skipped: true, reason, ejercicio: input.ejercicio };
}

export type Submit180Input = {
  tenantId: string;
  ejercicio: number;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit180Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo180Result;
    }
  | { ok: false; error: string; message: string };

export async function submit180ForTenant(input: Submit180Input): Promise<Submit180Result> {
  if (!input.tenantId) return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }
  const computed = await compute180ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    persist: false,
  });
  if (!computed.ok) {
    return { ok: false, error: 'compute_failed', message: computed.error ?? 'No se pudo recomputar el 180.' };
  }
  if (computed.output.skipped) {
    return { ok: false, error: 'compute_skipped', message: `No procede 180: ${computed.output.reason}` };
  }
  const period = `A-${input.ejercicio}`;
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: { tenantId_model_period: { tenantId: input.tenantId, model: '180', period } },
    select: { id: true, status: true },
  });
  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 180 ${input.ejercicio}. Computa primero con persist=true.`,
    };
  }
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '180',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '180',
      ejercicio: result.ejercicio,
      lineas: result.lineas,
      totalBase: result.totalBase,
      totalRetenciones: result.totalRetenciones,
      perceptores: result.perceptores,
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

export function buildNotesFromResult180(result: Modelo180Result): string {
  const lines = [
    `Borrador 180 (anual) computado por Isaak desde el Ledger.`,
    `Arrendadores declarados: ${result.perceptores}`,
    `Total bases: ${result.totalBase.toFixed(2)}€`,
    `Total retenciones practicadas: ${result.totalRetenciones.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
