// C-B3 — Modelo 111 (retenciones IRPF practicadas a terceros).
//
// Trimestral. Suma las retenciones IRPF que el contribuyente ha
// PRACTICADO a:
//   * Trabajadores (nóminas, docType='payroll')
//   * Profesionales (15% sobre la base, en invoice_in de profesionales)
//   * Otros perceptores (premios, etc.)
//
// El Ledger no tiene un campo `retention_amount` explícito, así que la
// derivamos como: max(taxBase + vatAmount - amount, 0). Esa diferencia
// representa lo que el contribuyente RETUVO al pagar al perceptor.
//
// Para v1 separamos en 2 grupos:
//   * Trabajadores: docType='payroll'
//   * Profesionales/otros: docType='invoice_in' con retención > 0

import type { Trimestre } from './fiscal-models';

export type { Trimestre };

export type LedgerEntryFor111 = {
  docType: string;
  amount: string;
  taxBase: string | null;
  vatAmount: string | null;
  entryDate: string;
  description: string | null;
};

export type Modelo111Result = {
  ejercicio: number;
  periodo: Trimestre;
  trabajadores: {
    perceptores: number;
    basesRetenciones: number;
    importeRetenciones: number;
  };
  profesionales: {
    perceptores: number;
    basesRetenciones: number;
    importeRetenciones: number;
  };
  totalBases: number;
  totalRetenciones: number;
  resultado: number; // == totalRetenciones (a ingresar siempre)
  advertencias: string[];
};

export type Compute111Input = {
  ejercicio: number;
  periodo: Trimestre;
  ledgerRows: ReadonlyArray<LedgerEntryFor111>;
};

export type Compute111Output =
  | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
  | { skipped: false; result: Modelo111Result };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

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

// Calcula la retención implícita: diferencia entre el importe bruto
// teórico (taxBase + vatAmount) y el importe realmente pagado.
function retencionImplicita(r: LedgerEntryFor111): number {
  const base = parseDecimal(r.taxBase);
  const iva = parseDecimal(r.vatAmount);
  const total = parseDecimal(r.amount);
  if (base <= 0) return 0;
  const bruto = base + iva;
  return round2(Math.max(bruto - total, 0));
}

export function compute111FromLedger(input: Compute111Input): Compute111Output {
  const { from, to } = quarterRangeISO(input.ejercicio, input.periodo);
  const periodRows = input.ledgerRows.filter(
    (r) => r.entryDate >= from && r.entryDate <= to,
  );

  const trabajadoresRows = periodRows.filter((r) => r.docType === 'payroll');
  const profesionalesRows = periodRows
    .filter((r) => r.docType === 'invoice_in')
    .filter((r) => retencionImplicita(r) > 0);

  const trabajadoresBases = round2(
    trabajadoresRows.reduce((s, r) => s + parseDecimal(r.taxBase), 0),
  );
  const trabajadoresRet = round2(
    trabajadoresRows.reduce((s, r) => {
      // Para payroll: si hay retención implícita (taxBase+iva-amount > 0)
      // la usamos; si no, asumimos que amount es ya neto y no hay info.
      const r1 = retencionImplicita(r);
      if (r1 > 0) return s + r1;
      // Si no hay taxBase, no podemos calcular; lo ignoramos en v1.
      return s;
    }, 0),
  );

  const profesionalesBases = round2(
    profesionalesRows.reduce((s, r) => s + parseDecimal(r.taxBase), 0),
  );
  const profesionalesRet = round2(
    profesionalesRows.reduce((s, r) => s + retencionImplicita(r), 0),
  );

  const totalBases = round2(trabajadoresBases + profesionalesBases);
  const totalRetenciones = round2(trabajadoresRet + profesionalesRet);

  const advertencias: string[] = [];
  if (trabajadoresRows.length > 0 && trabajadoresRet === 0) {
    advertencias.push(
      'Hay nóminas en el periodo pero no se detectó retención IRPF. Verifica que las nóminas se registran con taxBase=salario bruto y amount=salario líquido para que Isaak pueda inferir la retención.',
    );
  }
  if (profesionalesRows.length === 0 && trabajadoresRows.length === 0) {
    advertencias.push(
      'No se han detectado nóminas ni facturas profesionales con retención en este periodo. Verifica si te corresponde presentar 111.',
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      trabajadores: {
        perceptores: trabajadoresRows.length,
        basesRetenciones: trabajadoresBases,
        importeRetenciones: trabajadoresRet,
      },
      profesionales: {
        perceptores: profesionalesRows.length,
        basesRetenciones: profesionalesBases,
        importeRetenciones: profesionalesRet,
      },
      totalBases,
      totalRetenciones,
      resultado: totalRetenciones,
      advertencias,
    },
  };
}
