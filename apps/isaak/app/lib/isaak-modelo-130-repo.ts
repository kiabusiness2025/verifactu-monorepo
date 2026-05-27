// C-B2 — Wrapper Prisma del cálculo del 130.
//
// Carga las filas del Ledger del periodo acumulado (1 ene → fin trim) +
// el perfil fiscal, ejecuta el cálculo puro y opcionalmente persiste
// como IsaakTaxReturn con status='draft'.

import { prisma } from './prisma';
import {
  accumulatedRangeISO,
  compute130FromLedger,
  type Compute130Output,
  type LedgerEntryFor130,
} from './isaak-modelo-130-ledger';
import { getTaxpayerProfileAsSnapshot } from './isaak-taxpayer-profile';
import type { Trimestre, Modelo130Result } from './fiscal-models';
import { upsertTaxReturn } from './isaak-tax-returns';
import { createSubmission, type CreateSubmissionResult } from './isaak-aeat-submission';

export type Compute130ForTenantInput = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  retencionesAcumuladas?: number;
  ingresosACuenta?: number;
  persist?: boolean;
  createdBy?: string;
};

export type Compute130ForTenantResult = {
  ok: boolean;
  output: Compute130Output;
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

async function loadLedgerRowsForPeriod130(
  tenantId: string,
  from: string,
  to: string,
): Promise<LedgerEntryFor130[]> {
  type Row = {
    docType: string;
    amount: unknown;
    taxBase: unknown;
    vatAmount: unknown;
    entryDate: Date;
    description: string | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       doc_type    AS "docType",
       amount,
       tax_base    AS "taxBase",
       vat_amount  AS "vatAmount",
       entry_date  AS "entryDate",
       description AS "description"
     FROM isaak_ledger_entries
     WHERE tenant_id = $1::uuid
       AND doc_type IN ('invoice_out', 'invoice_in', 'expense', 'tax_payment')
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

export async function compute130ForTenant(
  input: Compute130ForTenantInput,
): Promise<Compute130ForTenantResult> {
  if (!input.tenantId) {
    return { ok: false, output: skipResult(input, 'tenant_required'), error: 'tenantId required' };
  }

  const { from, to } = accumulatedRangeISO(input.ejercicio, input.periodo);

  try {
    const [ledgerRows, profile] = await Promise.all([
      loadLedgerRowsForPeriod130(input.tenantId, from, to),
      getTaxpayerProfileAsSnapshot(input.tenantId),
    ]);

    const output = compute130FromLedger({
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      ledgerRows,
      profile,
      retencionesAcumuladas: input.retencionesAcumuladas,
      ingresosACuenta: input.ingresosACuenta,
    });

    if (!input.persist || output.skipped) {
      return { ok: true, output, persistedAsDraft: false };
    }

    const period = `Q${input.periodo[0]}-${input.ejercicio}`;
    const result = output.result;
    const persisted = await upsertTaxReturn({
      tenantId: input.tenantId,
      model: '130',
      period,
      status: 'draft',
      amountDeclared: result.rendimientoNeto.toFixed(2),
      amountToPay: result.resultado > 0 ? result.resultado.toFixed(2) : null,
      amountToRefund: null, // 130 nunca es a devolver
      notes: buildNotesFromResult130(result),
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
  input: Pick<Compute130ForTenantInput, 'ejercicio' | 'periodo'>,
  reason: string,
): Compute130Output {
  return {
    skipped: true,
    reason,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
  };
}

// ─── Confirmar borrador → IsaakAeatSubmission ───────────────────────

export type Submit130Input = {
  tenantId: string;
  ejercicio: number;
  periodo: Trimestre;
  submittedBy: string;
  certFingerprint?: string | null;
  retencionesAcumuladas?: number;
  ingresosACuenta?: number;
};

export type Submit130Result =
  | {
      ok: true;
      submissionId: string;
      taxReturnId: string;
      payloadHash: string;
      result: Modelo130Result;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export async function submit130ForTenant(input: Submit130Input): Promise<Submit130Result> {
  if (!input.tenantId) {
    return { ok: false, error: 'invalid_input', message: 'tenantId required' };
  }
  if (!input.submittedBy?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'submittedBy required' };
  }

  const computed = await compute130ForTenant({
    tenantId: input.tenantId,
    ejercicio: input.ejercicio,
    periodo: input.periodo,
    retencionesAcumuladas: input.retencionesAcumuladas,
    ingresosACuenta: input.ingresosACuenta,
    persist: false,
  });

  if (!computed.ok) {
    return {
      ok: false,
      error: 'compute_failed',
      message: computed.error ?? 'No se pudo recomputar el 130.',
    };
  }
  if (computed.output.skipped) {
    return {
      ok: false,
      error: 'compute_skipped',
      message: `No procede 130 para este tenant: ${computed.output.reason}`,
    };
  }

  const period = `Q${input.periodo[0]}-${input.ejercicio}`;

  const existingDraft = await prisma.isaakTaxReturn.findUnique({
    where: {
      tenantId_model_period: {
        tenantId: input.tenantId,
        model: '130',
        period,
      },
    },
    select: { id: true, status: true },
  });

  if (!existingDraft) {
    return {
      ok: false,
      error: 'no_draft',
      message: `No existe un borrador 130 ${input.periodo} ${input.ejercicio} para este tenant. Computa primero el borrador con persist=true.`,
    };
  }

  const result = computed.output.result;
  const submissionResult: CreateSubmissionResult = await createSubmission({
    tenantId: input.tenantId,
    model: '130',
    period,
    taxReturnId: existingDraft.id,
    submittedBy: input.submittedBy.trim(),
    certFingerprint: input.certFingerprint ?? null,
    payload: {
      model: '130',
      ejercicio: result.ejercicio,
      periodo: result.periodo,
      ingresosAcumulados: result.ingresosAcumulados,
      gastosAcumulados: result.gastosAcumulados,
      rendimientoNeto: result.rendimientoNeto,
      cuotaPrevia: result.cuotaPrevia,
      retencionesAcumuladas: result.retencionesAcumuladas,
      ingresosACuenta: result.ingresosACuenta,
      resultado: result.resultado,
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

export function buildNotesFromResult130(result: Modelo130Result): string {
  const lines: string[] = [
    `Borrador 130 computado por Isaak desde el Ledger.`,
    `Ingresos íntegros acumulados (1 ene → fin ${result.periodo}): ${result.ingresosAcumulados.toFixed(2)}€`,
    `Gastos deducibles acumulados: ${result.gastosAcumulados.toFixed(2)}€`,
    `Rendimiento neto: ${result.rendimientoNeto.toFixed(2)}€`,
    `Cuota (20%): ${result.cuotaPrevia.toFixed(2)}€`,
    `Retenciones acumuladas: ${result.retencionesAcumuladas.toFixed(2)}€`,
    `Pagos fraccionados previos: ${result.ingresosACuenta.toFixed(2)}€`,
    `Resultado a ingresar: ${result.resultado.toFixed(2)}€`,
  ];
  if (result.advertencias.length > 0) {
    lines.push('', 'Advertencias:');
    for (const a of result.advertencias) {
      lines.push(`- ${a}`);
    }
  }
  return lines.join('\n');
}
