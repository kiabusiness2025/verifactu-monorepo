// C-B8 — Modelo 190 (resumen anual retenciones rendimientos trabajo y
// actividades profesionales/agrarias).
//
// Anual. Lista cada perceptor con:
//   * Clave: A=trabajadores, B=trabajadores pensionistas, G=profesionales, etc.
//   * Base anual, retención anual
//
// Es el resumen anual del 111. Se presenta en enero del año siguiente.
// Misma detección que 111 (payroll vs invoice_in con retención).

import type { LedgerEntryFor111 } from './isaak-modelo-111-ledger';

export type LedgerEntryFor190 = LedgerEntryFor111 & {
  counterpartyNif: string | null;
  counterpartyName: string | null;
};

export type Modelo190Clave = 'A' | 'G';

export type Modelo190Linea = {
  nif: string;
  nombre: string;
  clave: Modelo190Clave; // A=trabajador, G=profesional
  baseAnual: number;
  retencionAnual: number;
  operaciones: number;
};

export type Modelo190Result = {
  ejercicio: number;
  lineas: Modelo190Linea[];
  totalBase: number;
  totalRetenciones: number;
  perceptoresTrabajadores: number;
  perceptoresProfesionales: number;
  advertencias: string[];
};

export type Compute190Input = {
  ejercicio: number;
  ledgerRows: ReadonlyArray<LedgerEntryFor190>;
};

export type Compute190Output =
  | { skipped: true; reason: string; ejercicio: number }
  | { skipped: false; result: Modelo190Result };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function retencionImplicita(r: LedgerEntryFor190): number {
  const base = parseDecimal(r.taxBase);
  const iva = parseDecimal(r.vatAmount);
  const total = parseDecimal(r.amount);
  if (base <= 0) return 0;
  const bruto = base + iva;
  return round2(Math.max(bruto - total, 0));
}

export function compute190FromLedger(input: Compute190Input): Compute190Output {
  const yearStart = `${input.ejercicio}-01-01`;
  const yearEnd = `${input.ejercicio}-12-31`;

  const eligible = input.ledgerRows.filter(
    (r) => r.entryDate >= yearStart && r.entryDate <= yearEnd,
  );

  type Bucket = {
    nombre: string;
    clave: Modelo190Clave;
    baseAnual: number;
    retencionAnual: number;
    operaciones: number;
  };
  const map = new Map<string, Bucket>();

  for (const r of eligible) {
    const isPayroll = r.docType === 'payroll';
    const isInvoice = r.docType === 'invoice_in';
    if (!isPayroll && !isInvoice) continue;

    const ret = retencionImplicita(r);
    if (ret <= 0 && !isPayroll) continue; // payroll: cuenta aunque retención=0
    if (ret <= 0) continue;

    const nif = (r.counterpartyNif ?? '').trim().toUpperCase();
    if (!nif) continue;

    const clave: Modelo190Clave = isPayroll ? 'A' : 'G';
    const key = `${nif}|${clave}`;
    const b = map.get(key) ?? {
      nombre: r.counterpartyName ?? '',
      clave,
      baseAnual: 0,
      retencionAnual: 0,
      operaciones: 0,
    };
    b.baseAnual += parseDecimal(r.taxBase);
    b.retencionAnual += ret;
    b.operaciones += 1;
    if (!b.nombre && r.counterpartyName) b.nombre = r.counterpartyName;
    map.set(key, b);
  }

  const lineas: Modelo190Linea[] = Array.from(map.entries())
    .map(([key, b]) => {
      const [nif] = key.split('|');
      return {
        nif: nif ?? '',
        nombre: b.nombre,
        clave: b.clave,
        baseAnual: round2(b.baseAnual),
        retencionAnual: round2(b.retencionAnual),
        operaciones: b.operaciones,
      };
    })
    .sort((a, b) =>
      a.clave !== b.clave
        ? a.clave.localeCompare(b.clave)
        : b.retencionAnual - a.retencionAnual,
    );

  const totalBase = round2(lineas.reduce((s, l) => s + l.baseAnual, 0));
  const totalRetenciones = round2(lineas.reduce((s, l) => s + l.retencionAnual, 0));
  const perceptoresTrabajadores = lineas.filter((l) => l.clave === 'A').length;
  const perceptoresProfesionales = lineas.filter((l) => l.clave === 'G').length;

  const advertencias: string[] = [];
  if (lineas.length === 0) {
    advertencias.push(
      'No se detectaron perceptores con retención en el ejercicio. Si no has presentado 111 trimestrales, tampoco procede 190.',
    );
  }
  const sinNombre = lineas.filter((l) => !l.nombre).length;
  if (sinNombre > 0) {
    advertencias.push(
      `${sinNombre} perceptor(es) sin razón social. AEAT exige nombre completo en el 190.`,
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      lineas,
      totalBase,
      totalRetenciones,
      perceptoresTrabajadores,
      perceptoresProfesionales,
      advertencias,
    },
  };
}
