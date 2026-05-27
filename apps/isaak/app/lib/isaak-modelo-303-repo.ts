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
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

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

// ─── C-B1.b — Confirmar borrador → IsaakAeatSubmission ───────────────

export type Submit303Input = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  submittedBy: string;
  certFingerprint?: string | null;
};

export type Submit303Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo303Result;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export async function submit303ForTenant(input: Submit303Input): Promise<Submit303Result> {
  if (!input.tenantId) {
    return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  }
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }

  // 1. Re-computar el borrador desde el Ledger actual (snapshot del momento
  //    de la presentación). Si el ledger cambió desde que se guardó el
  //    draft, el payload reflejará ese cambio — es lo correcto: lo que se
  //    presenta debe ser lo que está en el libro AHORA.
  const computed = await compute303ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
    persist: false,
  });

  if (!computed.ok) {
    return {
      ok: false,
      error: 'compute_failed',
      message: computed.error ?? 'No se pudo recomputar el 303.',
    };
  }
  if (computed.output.skipped) {
    return {
      ok: false,
      error: 'compute_skipped',
      message: `No procede 303 para este tenant: ${computed.output.reason}`,
    };
  }

  const period = `Q${input.periodo[0]}-${input.ejercicio}`;

  // 2. Buscar el draft existente (debe estar persistido previamente vía
  //    compute303ForTenant({persist:true})).
  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: {
      tenantId_model_period: {
        tenantId: input.tenantId,
        model: '303',
        period,
      },
    },
    select: { id: true, status: true },
  });

  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 303 ${input.periodo} ${input.ejercicio} para este tenant. Computa primero el borrador con persist=true.`,
    };
  }

  // 3. Crear submission + promover el draft a presented (transaccional).
  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '303',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '303',
      ejercicio: result.ejercicio,
      periodo: result.periodo,
      totalDevengado: result.totalDevengado,
      totalSoportado: result.totalSoportado,
      resultado: result.resultado,
      facturas: result.facturas,
      compras: result.compras,
      repercutidoPorTipo: result.repercutido,
      soportadoPorTipo: result.soportado,
      advertencias: result.advertencias,
    },
  });

  if (!submissionResult.ok) {
    return {
      ok: false,
      error: submissionResult.error,
      message: submissionResult.message,
    };
  }

  return {
    ok: true,
    submissionId: submissionResult.submissionId,
    taxReturnId: existingDraft.id,
    payloadHash: submissionResult.payloadHash,
    result,
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
