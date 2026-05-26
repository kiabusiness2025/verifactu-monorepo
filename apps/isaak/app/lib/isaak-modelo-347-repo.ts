// C-B5 — Wrapper Prisma del cálculo del 347 (anual).

import { prisma } from './prisma';
import {
  compute347FromLedger,
  type Compute347Output,
  type LedgerEntryFor347,
  type Modelo347Result,
} from './isaak-modelo-347-ledger';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute347ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  persist?: boolean;
  createdBy?: string;
};

export type Compute347ForTenantResult = {
  ok: boolean;
  output: Compute347Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForYear347(
  tenantId: string,
  ejercicio: number,
): Promise<LedgerEntryFor347[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatRate: unknown;
    vatAmount: unknown;
    entryDate: Date;
    counterpartyNif: string | null;
    counterpartyName: string | null;
  };
  const from = `${ejercicio}-01-01`;
  const to = `${ejercicio}-12-31`;
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT doc_type AS "docType", amount, tax_base AS "taxBase",
            vat_rate AS "vatRate", vat_amount AS "vatAmount",
            entry_date AS "entryDate",
            counterparty_nif AS "counterpartyNif",
            counterparty_name AS "counterpartyName"
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
  }));
}

export async function compute347ForTenant(
  input: Compute347ForTenantInput,
): Promise<Compute347ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skipResult(input, 'tenant_required'), error: 'tenantId required' };
  }
  try {
    const ledgerRows = await loadLedgerRowsForYear347(input.tenantId, input.ejercicio);
    const output = compute347FromLedger({ ejercicio: input.ejercicio, ledgerRows });
    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }
    const period = `A-${input.ejercicio}`;
    const result = output.result;
    const totalDeclarado = result.totalDeclaradoClientes + result.totalDeclaradoProveedores;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '347',
      period,
      status: 'draft',
      amountDeclared: totalDeclarado.toFixed(2),
      amountToPay: null,
      amountToRefund: null,
      notes: buildNotesFromResult347(result),
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
  input: Pick<Compute347ForTenantInput, 'ejercicio'>,
  reason: string,
): Compute347Output {
  return { skipped: true, reason, ejercicio: input.ejercicio };
}

export type Submit347Input = {
  tenantId: string;
  ejercicio: number;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit347Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo347Result;
    }
  | { ok: false; error: string; message: string };

export async function submit347ForTenant(input: Submit347Input): Promise<Submit347Result> {
  if (!input.tenantId) return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }
  const computed = await compute347ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    persist: false,
  });
  if (!computed.ok) {
    return { ok: false, error: 'compute_failed', message: computed.error ?? 'No se pudo recomputar el 347.' };
  }
  if (computed.output.skipped) {
    return { ok: false, error: 'compute_skipped', message: `No procede 347: ${computed.output.reason}` };
  }
  const period = `A-${input.ejercicio}`;
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: { tenantId_model_period: { tenantId: input.tenantId, model: '347', period } },
    select: { id: true, status: true },
  });
  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 347 ${input.ejercicio}. Computa primero con persist=true.`,
    };
  }
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '347',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '347',
      ejercicio: result.ejercicio,
      umbral: result.umbral,
      lineasClientes: result.lineasClientes,
      lineasProveedores: result.lineasProveedores,
      totalDeclaradoClientes: result.totalDeclaradoClientes,
      totalDeclaradoProveedores: result.totalDeclaradoProveedores,
      contrapartesExcluidasPorUmbral: result.contrapartesExcluidasPorUmbral,
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

export function buildNotesFromResult347(result: Modelo347Result): string {
  const lines = [
    `Borrador 347 computado por Isaak desde el Ledger.`,
    `Umbral aplicado: ${result.umbral.toFixed(2)}€ anuales.`,
    `Clientes declarados: ${result.lineasClientes.length} (total ${result.totalDeclaradoClientes.toFixed(2)}€)`,
    `Proveedores declarados: ${result.lineasProveedores.length} (total ${result.totalDeclaradoProveedores.toFixed(2)}€)`,
    `Contrapartes excluidas por no superar umbral: ${result.contrapartesExcluidasPorUmbral}`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}
