// C-B7 — Modelo 180 (resumen anual retenciones arrendamientos urbanos).
//
// Anual. Lista por cada arrendador (NIF + nombre) con:
//   * Base anual acumulada
//   * Retención anual practicada
//   * Datos de la finca (referencia catastral si está disponible)
//
// Es el resumen anual del 115. Se presenta en enero del año siguiente.
// Misma detección que 115 (PGC 621 o descripción).

import type { LedgerEntryFor115 } from './isaak-modelo-115-ledger';

export type LedgerEntryFor180 = LedgerEntryFor115;

export type Modelo180Linea = {
  nif: string;
  nombre: string;
  baseAnual: number;
  retencionAnual: number;
  operaciones: number;
};

export type Modelo180Result = {
  ejercicio: number;
  lineas: Modelo180Linea[];
  totalBase: number;
  totalRetenciones: number;
  perceptores: number;
  advertencias: string[];
};

export type Compute180Input = {
  ejercicio: number;
  ledgerRows: ReadonlyArray<LedgerEntryFor180>;
};

export type Compute180Output =
  | { skipped: true; reason: string; ejercicio: number }
  | { skipped: false; result: Modelo180Result };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
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

function isRentRelated(r: LedgerEntryFor180): boolean {
  if (r.accountDebit && r.accountDebit.startsWith('621')) return true;
  if (!r.description) return false;
  const lc = r.description.toLowerCase();
  return RENT_HINTS.some((h) => lc.includes(h));
}

function retencionImplicita(r: LedgerEntryFor180): number {
  const base = parseDecimal(r.taxBase);
  const iva = parseDecimal(r.vatAmount);
  const total = parseDecimal(r.amount);
  if (base <= 0) return 0;
  const bruto = base + iva;
  return round2(Math.max(bruto - total, 0));
}

export function compute180FromLedger(input: Compute180Input): Compute180Output {
  const yearStart = `${input.ejercicio}-01-01`;
  const yearEnd = `${input.ejercicio}-12-31`;

  const eligible = input.ledgerRows
    .filter((r) => r.entryDate >= yearStart && r.entryDate <= yearEnd)
    .filter((r) => r.docType === 'invoice_in' || r.docType === 'expense')
    .filter(isRentRelated)
    .filter((r) => retencionImplicita(r) > 0);

  type Bucket = { nombre: string; baseAnual: number; retencionAnual: number; operaciones: number };
  const map = new Map<string, Bucket>();

  for (const r of eligible) {
    const nif = (r.counterpartyNif ?? '').trim().toUpperCase();
    if (!nif) continue;
    const b = map.get(nif) ?? {
      nombre: r.counterpartyName ?? '',
      baseAnual: 0,
      retencionAnual: 0,
      operaciones: 0,
    };
    b.baseAnual += parseDecimal(r.taxBase);
    b.retencionAnual += retencionImplicita(r);
    b.operaciones += 1;
    if (!b.nombre && r.counterpartyName) b.nombre = r.counterpartyName;
    map.set(nif, b);
  }

  const lineas: Modelo180Linea[] = Array.from(map.entries())
    .map(([nif, b]) => ({
      nif,
      nombre: b.nombre,
      baseAnual: round2(b.baseAnual),
      retencionAnual: round2(b.retencionAnual),
      operaciones: b.operaciones,
    }))
    .sort((a, b) => b.retencionAnual - a.retencionAnual);

  const totalBase = round2(lineas.reduce((s, l) => s + l.baseAnual, 0));
  const totalRetenciones = round2(lineas.reduce((s, l) => s + l.retencionAnual, 0));

  const advertencias: string[] = [];
  if (lineas.length === 0) {
    advertencias.push(
      'No se detectaron alquileres con retención en el ejercicio. Si no has presentado 115 trimestrales, tampoco procede 180.',
    );
  }
  const sinNombre = lineas.filter((l) => !l.nombre).length;
  if (sinNombre > 0) {
    advertencias.push(
      `${sinNombre} arrendador(es) sin razón social. AEAT exige nombre del perceptor en el 180.`,
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      lineas,
      totalBase,
      totalRetenciones,
      perceptores: lineas.length,
      advertencias,
    },
  };
}
