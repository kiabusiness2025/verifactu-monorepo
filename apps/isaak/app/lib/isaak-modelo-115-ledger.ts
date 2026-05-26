// C-B6 — Modelo 115 (retenciones IRPF en arrendamientos urbanos).
//
// Trimestral. Suma las retenciones IRPF que el arrendatario (el
// contribuyente que paga el alquiler) ha PRACTICADO al arrendador.
// El tipo estándar es 19%.
//
// Detección desde el Ledger:
//   * docType='invoice_in' o 'expense'
//   * Cuenta PGC 621 (arrendamientos y cánones) en el debe, O
//     descripción contiene palabras-señal de alquiler
//   * Retención implícita: max(taxBase + vatAmount - amount, 0)

import type { Trimestre } from './fiscal-models';

export type { Trimestre };

export type LedgerEntryFor115 = {
  docType: string;
  amount: string;
  taxBase: string | null;
  vatAmount: string | null;
  entryDate: string;
  description: string | null;
  accountDebit: string | null;
  counterpartyNif: string | null;
  counterpartyName: string | null;
};

export type Modelo115Result = {
  ejercicio: number;
  periodo: Trimestre;
  arrendadores: number;
  basesRetenciones: number;
  importeRetenciones: number;
  resultado: number; // == importeRetenciones (a ingresar)
  advertencias: string[];
};

export type Compute115Input = {
  ejercicio: number;
  periodo: Trimestre;
  ledgerRows: ReadonlyArray<LedgerEntryFor115>;
};

export type Compute115Output =
  | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
  | { skipped: false; result: Modelo115Result };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function quarterRangeISO115(
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

const RENT_HINTS = [
  'alquiler',
  'arrendamiento',
  'arrendamient',
  'renta mensual',
  'rental',
  'lease',
  'local comercial',
];

function isRentRelated(r: LedgerEntryFor115): boolean {
  // Señal fuerte: cuenta PGC 621 (arrendamientos y cánones)
  if (r.accountDebit && r.accountDebit.startsWith('621')) return true;
  // Señal débil: palabra-señal en descripción
  if (!r.description) return false;
  const lc = r.description.toLowerCase();
  return RENT_HINTS.some((h) => lc.includes(h));
}

function retencionImplicita(r: LedgerEntryFor115): number {
  const base = parseDecimal(r.taxBase);
  const iva = parseDecimal(r.vatAmount);
  const total = parseDecimal(r.amount);
  if (base <= 0) return 0;
  const bruto = base + iva;
  return round2(Math.max(bruto - total, 0));
}

export function compute115FromLedger(input: Compute115Input): Compute115Output {
  const { from, to } = quarterRangeISO115(input.ejercicio, input.periodo);

  const rentRows = input.ledgerRows
    .filter((r) => r.entryDate >= from && r.entryDate <= to)
    .filter((r) => r.docType === 'invoice_in' || r.docType === 'expense')
    .filter(isRentRelated)
    .filter((r) => retencionImplicita(r) > 0);

  // Agrupamos por NIF del arrendador (cada arrendador es un perceptor).
  const arrendadoresSet = new Set<string>();
  for (const r of rentRows) {
    if (r.counterpartyNif) arrendadoresSet.add(r.counterpartyNif.trim().toUpperCase());
  }

  const basesRetenciones = round2(
    rentRows.reduce((s, r) => s + parseDecimal(r.taxBase), 0),
  );
  const importeRetenciones = round2(
    rentRows.reduce((s, r) => s + retencionImplicita(r), 0),
  );

  const advertencias: string[] = [];
  if (rentRows.length === 0) {
    advertencias.push(
      'No se detectaron facturas de alquiler con retención en el periodo. Si pagas alquiler de un local comercial debes practicar el 19% al arrendador (excepto vivienda).',
    );
  }
  if (rentRows.length > 0 && arrendadoresSet.size === 0) {
    advertencias.push(
      'Hay facturas de alquiler con retención pero ninguna tiene NIF del arrendador. AEAT exige NIF del perceptor.',
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      arrendadores: arrendadoresSet.size,
      basesRetenciones,
      importeRetenciones,
      resultado: importeRetenciones,
      advertencias,
    },
  };
}
