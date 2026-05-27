// C-B2 — Borrador del modelo 130 (IRPF pago fraccionado trimestral)
// computado desde el Isaak Ledger.
//
// Modelo 130 = pago fraccionado IRPF para autónomos en estimación
// directa (NO módulos/EOS, NO sociedades).
//
// Cálculo:
//   Ingresos íntegros acumulados (1 ene → fin del trimestre)
// - Gastos deducibles acumulados (1 ene → fin del trimestre)
// = Rendimiento neto acumulado
// × 20%
// = Cuota previa acumulada
// - Retenciones acumuladas del ejercicio
// - Pagos fraccionados previos del año (130s de trimestres anteriores)
// = Resultado a ingresar (mín. 0; nunca a devolver)
//
// Diferencias con 130 legacy (Holded-based):
//   * Fuente: IsaakLedgerEntry (fuente de verdad del Robot Contable)
//   * Pure: cálculo no toca DB; el caller pasa rows ya cargadas
//   * Respeta perfil fiscal: si no es autónomo o está en estimación
//     objetiva (módulos), devuelve skipped con motivo
//   * Retenciones y pagos previos pueden venir del Ledger
//     (tax_payment de 130s pasados) o pasarse manualmente

import type { Modelo130Result, Trimestre } from './fiscal-models';
import type { TaxpayerProfileSnapshot } from './inspector-aeat';

export type { Modelo130Result, Trimestre };

// Subset del IsaakLedgerEntry necesario para el cálculo. El caller
// (repo) carga estos campos desde la tabla. Mantener independiente
// de Prisma para tests sin DB.
export type LedgerEntryFor130 = {
  docType: string; // 'invoice_out' | 'invoice_in' | 'expense' | 'tax_payment'
  amount: string; // decimal as string
  taxBase: string | null;
  vatAmount: string | null;
  entryDate: string; // 'YYYY-MM-DD'
  description: string | null;
};

export type Compute130Input = {
  ejercicio: number;
  periodo: Trimestre;
  ledgerRows: ReadonlyArray<LedgerEntryFor130>;
  profile?: TaxpayerProfileSnapshot | null;
  // Retenciones acumuladas del ejercicio (input usuario o pre-llenado
  // desde 111 pasados). En el v1 lo pasa el caller.
  retencionesAcumuladas?: number;
  // Pagos fraccionados previos del año (130 trimestres anteriores). Si
  // no se pasa, lo computamos automáticamente desde los tax_payment del
  // Ledger marcados como '130' del mismo ejercicio.
  ingresosACuenta?: number;
};

export type Compute130Output =
  | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
  | { skipped: false; result: Modelo130Result };

// ─── Helpers ────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Rango acumulado: desde 1 enero hasta fin del trimestre indicado.
export function accumulatedRangeISO(
  ejercicio: number,
  periodo: Trimestre,
): { from: string; to: string } {
  const q = Number.parseInt(periodo[0]!, 10);
  if (!Number.isFinite(q) || q < 1 || q > 4) {
    throw new Error(`Invalid trimestre: ${periodo}`);
  }
  const endMonth = q * 3;
  const endDay = endMonth === 3 ? 31 : endMonth === 6 ? 30 : endMonth === 9 ? 30 : 31;
  return {
    from: `${ejercicio}-01-01`,
    to: `${ejercicio}-${String(endMonth).padStart(2, '0')}-${endDay}`,
  };
}

// Ingreso íntegro de una venta = base imponible (sin IVA).
// Si no hay taxBase, fallback a amount - vatAmount.
function ventaIngreso(r: LedgerEntryFor130): number {
  const base = parseDecimal(r.taxBase);
  if (base > 0) return base;
  const total = parseDecimal(r.amount);
  const iva = parseDecimal(r.vatAmount);
  return Math.max(total - iva, 0);
}

// Gasto deducible:
//   * invoice_in: taxBase (el IVA se recupera vía 303 aparte)
//   * expense:   amount (no formal invoice; IVA no recuperable → todo entra)
function gastoDeducible(r: LedgerEntryFor130): number {
  if (r.docType === 'expense') {
    return parseDecimal(r.amount);
  }
  const base = parseDecimal(r.taxBase);
  if (base > 0) return base;
  const total = parseDecimal(r.amount);
  const iva = parseDecimal(r.vatAmount);
  return Math.max(total - iva, 0);
}

// Detecta automáticamente los pagos previos del 130 del mismo año.
// Filtra tax_payments del ejercicio con '130' en la descripción,
// excluyendo los que mencionen explícitamente el trimestre actual
// (ej.: si calculamos 2T, excluimos "Pago 130 2T 2026").
// El pago del 1T suele datarse en abril (ya dentro de 2T), por eso
// usamos currentEnd como límite y no previousQuarterEnd.
function autoIngresosACuenta(
  rows: ReadonlyArray<LedgerEntryFor130>,
  ejercicio: number,
  periodo: Trimestre,
): number {
  const yearStart = `${ejercicio}-01-01`;
  const { to: currentEnd } = accumulatedRangeISO(ejercicio, periodo);
  const currentTrim = periodo; // '1T'|'2T'|'3T'|'4T'

  if (periodo === '1T') return 0;

  return round2(
    rows
      .filter(
        (r) =>
          r.docType === 'tax_payment' &&
          r.entryDate >= yearStart &&
          r.entryDate <= currentEnd &&
          (r.description ?? '').includes('130') &&
          !(r.description ?? '').includes(currentTrim),
      )
      .reduce((s, r) => s + parseDecimal(r.amount), 0),
  );
}

// ─── Cálculo principal ────────────────────────────────────────────────

export function compute130FromLedger(input: Compute130Input): Compute130Output {
  // Régimen: 130 solo aplica a autónomos en estimación directa.
  // Sociedades (sl/sa) → modelo 202, no 130.
  const taxpayerType = input.profile?.taxpayerType;
  if (
    taxpayerType &&
    taxpayerType !== 'autonomo' &&
    taxpayerType !== 'comunidad_bienes'
  ) {
    return {
      skipped: true,
      reason: 'no_aplica_no_autonomo',
      ejercicio: input.ejercicio,
      periodo: input.periodo,
    };
  }

  const { from, to } = accumulatedRangeISO(input.ejercicio, input.periodo);

  const periodRows = input.ledgerRows.filter(
    (r) => r.entryDate >= from && r.entryDate <= to,
  );

  const ventas = periodRows.filter((r) => r.docType === 'invoice_out');
  const gastosRows = periodRows.filter(
    (r) => r.docType === 'invoice_in' || r.docType === 'expense',
  );

  const ingresosAcumulados = round2(
    ventas.reduce((s, r) => s + ventaIngreso(r), 0),
  );
  const gastosAcumulados = round2(
    gastosRows.reduce((s, r) => s + gastoDeducible(r), 0),
  );

  const rendimientoNeto = round2(ingresosAcumulados - gastosAcumulados);
  const cuotaPrevia = round2(Math.max(rendimientoNeto * 0.2, 0));

  const retencionesAcumuladas =
    input.retencionesAcumuladas != null
      ? round2(Math.max(input.retencionesAcumuladas, 0))
      : 0;

  const ingresosACuenta =
    input.ingresosACuenta != null
      ? round2(Math.max(input.ingresosACuenta, 0))
      : autoIngresosACuenta(input.ledgerRows, input.ejercicio, input.periodo);

  const resultado = round2(
    Math.max(cuotaPrevia - retencionesAcumuladas - ingresosACuenta, 0),
  );

  const advertencias: string[] = [];
  if (rendimientoNeto <= 0) {
    advertencias.push(
      'Rendimiento neto acumulado ≤ 0 €. Resultado del modelo 130 es 0 € (no procede ingreso).',
    );
  }
  if (input.retencionesAcumuladas == null) {
    advertencias.push(
      'Retenciones acumuladas no especificadas. Si tu actividad sufre retenciones (profesionales 15%, agrarias 2%), revísalo antes de presentar.',
    );
  }
  if (input.ingresosACuenta == null && ingresosACuenta > 0) {
    advertencias.push(
      `Pagos fraccionados previos detectados automáticamente del Ledger: ${ingresosACuenta.toFixed(2)} €. Verifica con tus presentaciones anteriores del 130.`,
    );
  }
  if (taxpayerType == null) {
    advertencias.push(
      'No se ha definido el tipo de contribuyente en el perfil fiscal. Verifica que estás en estimación directa (no módulos).',
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      ingresosAcumulados,
      gastosAcumulados,
      rendimientoNeto,
      cuotaPrevia,
      retencionesAcumuladas,
      ingresosACuenta,
      resultado,
      advertencias,
    },
  };
}
