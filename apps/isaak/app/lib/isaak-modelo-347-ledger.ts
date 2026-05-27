// C-B5 — Modelo 347 (declaración anual operaciones con terceros > €3005.06).
//
// Anual (no trimestral). Lista por cada contraparte (cliente y/o
// proveedor) cuya suma anual de operaciones (sin IVA) supere €3005.06,
// con desglose trimestral.
//
// Exclusiones:
//   * Operaciones intracom (van al 349)
//   * Operaciones sujetas a retención (van al 190/180)
//   * Operaciones < €3005.06 anual con ese contraparte
//
// El umbral se aplica:
//   * A las ventas a un mismo cliente
//   * A las compras a un mismo proveedor
//   * Por separado (un mismo NIF puede aparecer como cliente y
//     proveedor independientemente)

import type { Trimestre } from './fiscal-models';

export type { Trimestre };

export const UMBRAL_347 = 3005.06;

export type LedgerEntryFor347 = {
  docType: string;
  amount: string;
  taxBase: string | null;
  vatRate: string | null;
  vatAmount: string | null;
  entryDate: string;
  counterpartyNif: string | null;
  counterpartyName: string | null;
};

export type Modelo347Trimestre = {
  T1: number;
  T2: number;
  T3: number;
  T4: number;
};

export type Modelo347Linea = {
  nif: string;
  nombre: string;
  tipo: 'cliente' | 'proveedor';
  totalAnual: number;
  trimestres: Modelo347Trimestre;
  operaciones: number;
};

export type Modelo347Result = {
  ejercicio: number;
  umbral: number;
  lineasClientes: Modelo347Linea[];
  lineasProveedores: Modelo347Linea[];
  totalDeclaradoClientes: number;
  totalDeclaradoProveedores: number;
  contrapartesExcluidasPorUmbral: number;
  advertencias: string[];
};

export type Compute347Input = {
  ejercicio: number;
  ledgerRows: ReadonlyArray<LedgerEntryFor347>;
};

export type Compute347Output =
  | { skipped: true; reason: string; ejercicio: number }
  | { skipped: false; result: Modelo347Result };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDecimal(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function isIntracomNif(nif: string | null | undefined): boolean {
  if (!nif) return false;
  const trimmed = nif.trim().toUpperCase();
  if (trimmed.length < 3) return false;
  const prefix = trimmed.slice(0, 2);
  const EU_PREFIXES = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'FI', 'FR', 'HR',
    'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE',
    'SI', 'SK', 'XI',
  ];
  return EU_PREFIXES.includes(prefix);
}

function quarterOf(entryDate: string): keyof Modelo347Trimestre {
  // entryDate = 'YYYY-MM-DD'
  const month = Number.parseInt(entryDate.slice(5, 7), 10);
  if (month <= 3) return 'T1';
  if (month <= 6) return 'T2';
  if (month <= 9) return 'T3';
  return 'T4';
}

function hasRetention(r: LedgerEntryFor347): boolean {
  // Si amount < taxBase + vatAmount, asumimos retención
  const base = parseDecimal(r.taxBase);
  const iva = parseDecimal(r.vatAmount);
  const total = parseDecimal(r.amount);
  if (base <= 0) return false;
  return base + iva - total > 0.01;
}

export function compute347FromLedger(input: Compute347Input): Compute347Output {
  const yearStart = `${input.ejercicio}-01-01`;
  const yearEnd = `${input.ejercicio}-12-31`;

  const eligible = input.ledgerRows.filter((r) => {
    if (r.entryDate < yearStart || r.entryDate > yearEnd) return false;
    if (!r.counterpartyNif?.trim()) return false;
    if (isIntracomNif(r.counterpartyNif)) return false;
    if (hasRetention(r)) return false;
    return r.docType === 'invoice_out' || r.docType === 'invoice_in' || r.docType === 'expense';
  });

  // Agrupar por (nif, tipo) donde tipo = cliente si invoice_out, proveedor si in
  type Bucket = {
    nombre: string;
    totalAnual: number;
    trimestres: Modelo347Trimestre;
    operaciones: number;
  };
  const clientes = new Map<string, Bucket>();
  const proveedores = new Map<string, Bucket>();

  for (const r of eligible) {
    const nif = (r.counterpartyNif ?? '').trim().toUpperCase();
    const importe = parseDecimal(r.taxBase) || parseDecimal(r.amount);
    const trim = quarterOf(r.entryDate);
    const isSale = r.docType === 'invoice_out';
    const target = isSale ? clientes : proveedores;
    const b = target.get(nif) ?? {
      nombre: r.counterpartyName ?? '',
      totalAnual: 0,
      trimestres: { T1: 0, T2: 0, T3: 0, T4: 0 },
      operaciones: 0,
    };
    b.totalAnual += importe;
    b.trimestres[trim] += importe;
    b.operaciones += 1;
    if (!b.nombre && r.counterpartyName) b.nombre = r.counterpartyName;
    target.set(nif, b);
  }

  function toLineas(
    map: Map<string, Bucket>,
    tipo: 'cliente' | 'proveedor',
  ): { lineas: Modelo347Linea[]; excluidos: number } {
    let excluidos = 0;
    const lineas: Modelo347Linea[] = [];
    for (const [nif, b] of map) {
      const total = round2(b.totalAnual);
      if (total <= UMBRAL_347) {
        excluidos += 1;
        continue;
      }
      lineas.push({
        nif,
        nombre: b.nombre,
        tipo,
        totalAnual: total,
        trimestres: {
          T1: round2(b.trimestres.T1),
          T2: round2(b.trimestres.T2),
          T3: round2(b.trimestres.T3),
          T4: round2(b.trimestres.T4),
        },
        operaciones: b.operaciones,
      });
    }
    lineas.sort((a, b) => b.totalAnual - a.totalAnual);
    return { lineas, excluidos };
  }

  const { lineas: lineasClientes, excluidos: exclC } = toLineas(clientes, 'cliente');
  const { lineas: lineasProveedores, excluidos: exclP } = toLineas(proveedores, 'proveedor');

  const totalDeclaradoClientes = round2(
    lineasClientes.reduce((s, l) => s + l.totalAnual, 0),
  );
  const totalDeclaradoProveedores = round2(
    lineasProveedores.reduce((s, l) => s + l.totalAnual, 0),
  );

  const advertencias: string[] = [];
  if (lineasClientes.length === 0 && lineasProveedores.length === 0) {
    advertencias.push(
      `Ningún contraparte supera el umbral de ${UMBRAL_347.toFixed(2)} € anuales. No procede presentar 347 si no hay líneas.`,
    );
  }
  const sinNombre =
    lineasClientes.filter((l) => !l.nombre).length +
    lineasProveedores.filter((l) => !l.nombre).length;
  if (sinNombre > 0) {
    advertencias.push(
      `${sinNombre} línea(s) sin razón social del contraparte. AEAT exige nombre completo en el 347.`,
    );
  }
  if (exclC + exclP > 0) {
    advertencias.push(
      `Excluidos del 347: ${exclC + exclP} contrapartes con operaciones ≤ ${UMBRAL_347.toFixed(2)} € anuales.`,
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      umbral: UMBRAL_347,
      lineasClientes,
      lineasProveedores,
      totalDeclaradoClientes,
      totalDeclaradoProveedores,
      contrapartesExcluidasPorUmbral: exclC + exclP,
      advertencias,
    },
  };
}
