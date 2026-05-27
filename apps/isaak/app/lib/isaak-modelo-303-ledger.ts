// C-B1 — Borrador del modelo 303 (IVA trimestral) computado desde el
// Isaak Ledger (no desde Holded).
//
// Diferencias con fiscal-models.ts/generateModelo303 (legacy Holded):
//   * Fuente: IsaakLedgerEntry (fuente de verdad del Robot Contable)
//   * Lectura por periodo + tenant (idempotente y testeable)
//   * Pure: el cálculo no toca DB; el caller pasa rows ya cargadas
//   * Respeta el perfil fiscal: si el tenant está en régimen
//     recargo_equivalencia o exento, NO genera 303 (devuelve skipped)
//
// La integración con SOAP AEAT y el envío real se hacen en C-B1.b/c.

import type { Modelo303Result, IvaTramo, Trimestre } from './fiscal-models';
import type { TaxpayerProfileSnapshot, VatRegime } from './inspector-aeat';

export type { Modelo303Result, IvaTramo, Trimestre };

// Tipos IVA reconocidos en España (peninsular). 5% se aplicó temporal
// 2023-2024 a alimentos. 0% es operaciones exentas/intracom.
const TIPOS_IVA = [0, 4, 5, 10, 21] as const;

// Subset del IsaakLedgerEntry necesario para el cálculo. El caller
// (repo) carga estos campos desde la tabla. Mantener este tipo
// independiente de Prisma para que los tests no requieran cliente DB.
export type LedgerEntryFor303 = {
  docType: string; // 'invoice_out' | 'invoice_in' | 'expense' | ...
  amount: string; // decimal as string
  taxBase: string | null;
  vatRate: string | null; // '21.00' etc.
  vatAmount: string | null;
  entryDate: string; // 'YYYY-MM-DD'
};

export type Compute303Input = {
  ejercicio: number;
  periodo: Trimestre;
  ledgerRows: ReadonlyArray<LedgerEntryFor303>;
  profile?: TaxpayerProfileSnapshot | null;
};

export type Compute303Output =
  | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
  | { skipped: false; result: Modelo303Result };

// ─── Helpers ────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Devuelve el periodo [from, to] inclusivo del trimestre/año dado.
export function quarterRangeISO(
  ejercicio: number,
  periodo: Trimestre,
): { from: string; to: string } {
  const q = Number.parseInt(periodo[0]!, 10);
  if (!Number.isFinite(q) || q < 1 || q > 4) {
    throw new Error(`Invalid trimestre: ${periodo}`);
  }
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = q * 3;
  const endDay = endMonth === 3 ? 31 : endMonth === 6 ? 30 : endMonth === 9 ? 30 : 31;
  return {
    from: `${ejercicio}-${String(startMonth).padStart(2, '0')}-01`,
    to: `${ejercicio}-${String(endMonth).padStart(2, '0')}-${endDay}`,
  };
}

function filterByDateRange(
  rows: ReadonlyArray<LedgerEntryFor303>,
  from: string,
  to: string,
): LedgerEntryFor303[] {
  return rows.filter((r) => r.entryDate >= from && r.entryDate <= to);
}

function aggregateTramos(rows: ReadonlyArray<LedgerEntryFor303>): IvaTramo[] {
  const buckets = new Map<number, { base: number; cuota: number }>();
  for (const r of rows) {
    if (!r.vatRate) continue;
    const rate = Number.parseFloat(r.vatRate);
    if (!Number.isFinite(rate)) continue;
    // Toleramos decimales (21.00 ~ 21). Snap al tipo reconocido más cercano.
    const snapped =
      TIPOS_IVA.find((t) => Math.abs(t - rate) < 0.5) ?? round2(rate);
    const bucket = buckets.get(snapped) ?? { base: 0, cuota: 0 };
    bucket.base += parseDecimal(r.taxBase) || parseDecimal(r.amount);
    bucket.cuota += parseDecimal(r.vatAmount);
    buckets.set(snapped, bucket);
  }
  return Array.from(buckets.entries())
    .map(([tipo, v]) => ({
      tipo,
      base: round2(v.base),
      cuota: round2(v.cuota),
    }))
    .sort((a, b) => a.tipo - b.tipo)
    .filter((t) => t.base > 0 || t.cuota > 0);
}

function totalCuota(tramos: ReadonlyArray<IvaTramo>): number {
  return round2(tramos.reduce((s, t) => s + t.cuota, 0));
}

// ─── Cálculo principal ────────────────────────────────────────────────

export function compute303FromLedger(input: Compute303Input): Compute303Output {
  const { from, to } = quarterRangeISO(input.ejercicio, input.periodo);

  // Régimen fiscal: si está en recargo equivalencia o exento → no
  // presenta 303. Devolvemos skipped explicit para que la UI/LLM lo
  // expliquen al usuario.
  const regime = input.profile?.vatRegime as VatRegime | null | undefined;
  if (regime === 'recargo_equivalencia') {
    return {
      skipped: true,
      reason: 'régimen_recargo_equivalencia',
      ejercicio: input.ejercicio,
      periodo: input.periodo,
    };
  }
  if (regime === 'exento') {
    return {
      skipped: true,
      reason: 'régimen_exento_iva',
      ejercicio: input.ejercicio,
      periodo: input.periodo,
    };
  }

  const periodRows = filterByDateRange(input.ledgerRows, from, to);
  const ventas = periodRows.filter((r) => r.docType === 'invoice_out');
  const compras = periodRows.filter(
    (r) => r.docType === 'invoice_in' || r.docType === 'expense',
  );

  const repercutido = aggregateTramos(ventas);
  const soportado = aggregateTramos(compras);

  const totalDevengado = totalCuota(repercutido);
  const totalSoportado = totalCuota(soportado);
  const resultado = round2(totalDevengado - totalSoportado);

  const advertencias: string[] = [];
  if (regime === 'criterio_caja') {
    advertencias.push(
      'Régimen de criterio de caja: el IVA se devenga al cobro/pago, no a la emisión. Revisa que el ledger refleje los cobros reales del periodo.',
    );
  }
  if (regime === 'prorrata') {
    advertencias.push(
      'Régimen de prorrata: parte del IVA soportado puede no ser deducible. Aplica el porcentaje de prorrata definitivo antes de presentar.',
    );
  }
  if (ventas.length === 0) {
    advertencias.push('No se encontraron facturas emitidas con IVA en el periodo.');
  }
  if (resultado < 0) {
    advertencias.push(
      `Resultado negativo (${resultado}€): IVA a compensar o devolver. Casilla 88 / casilla 73 según marca el modelo.`,
    );
  }

  const result: Modelo303Result = {
    ejercicio: input.ejercicio,
    periodo: input.periodo,
    repercutido,
    totalDevengado,
    soportado,
    totalSoportado,
    resultado,
    facturas: ventas.length,
    compras: compras.length,
    advertencias,
  };

  return { skipped: false, result };
}
