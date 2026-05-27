// C-B4 — Modelo 349 (resumen recapitulativo operaciones intracom).
//
// Trimestral (o mensual si supera €50k en algún trimestre del año o
// el anterior; el cambio de obligación se gestiona aparte).
//
// Por cada operación intracomunitaria, lista:
//   * NIF-IVA del contraparte (con prefijo país)
//   * Nombre del contraparte
//   * Clave de operación:
//       E = Entregas de bienes intracom (factura emitida sin IVA al cliente UE)
//       A = Adquisiciones de bienes intracom (factura recibida sin IVA de proveedor UE)
//       S = Prestaciones de servicios (emitidas, sin IVA, inversión sujeto pasivo)
//       I = Adquisiciones de servicios (recibidas, sin IVA, ISP)
//   * Importe total del periodo
//
// Detección de intracom:
//   * counterpartyNif empieza con 2 letras (código país ISO) ≠ "ES"
//   * vatRate = 0 (operación intracomunitaria → exenta de IVA español)
//
// Nota: la clasificación E vs S y A vs I requiere semántica del concepto
// (bienes vs servicios). En v1 asumimos: si la descripción contiene
// palabras como "servicio", "consultoría", "honorarios", "suscripción" →
// S/I; en otro caso → E/A.

import type { Trimestre } from './fiscal-models';

export type { Trimestre };

export type LedgerEntryFor349 = {
  docType: string;
  amount: string;
  taxBase: string | null;
  vatRate: string | null;
  vatAmount: string | null;
  entryDate: string;
  counterpartyNif: string | null;
  counterpartyName: string | null;
  description: string | null;
};

export type Modelo349Linea = {
  nifIva: string; // con prefijo país: 'PT123456789', 'FR12345...'
  nombre: string;
  clave: 'E' | 'A' | 'S' | 'I';
  importe: number;
  operaciones: number;
};

export type Modelo349Result = {
  ejercicio: number;
  periodo: Trimestre;
  lineas: Modelo349Linea[];
  totalEntregas: number; // suma de E + S
  totalAdquisiciones: number; // suma de A + I
  totalOperaciones: number;
  advertencias: string[];
};

export type Compute349Input = {
  ejercicio: number;
  periodo: Trimestre;
  ledgerRows: ReadonlyArray<LedgerEntryFor349>;
};

export type Compute349Output =
  | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
  | { skipped: false; result: Modelo349Result };

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
  // Códigos país UE (sin ES) — lista completa al 2026
  const EU_PREFIXES = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'FI', 'FR', 'HR',
    'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE',
    'SI', 'SK', 'XI', // Irlanda del Norte (post-Brexit)
  ];
  return EU_PREFIXES.includes(prefix);
}

const SERVICE_HINTS = [
  'servicio',
  'service',
  'consultor',
  'consult',
  'honorari',
  'fee',
  'suscrip',
  'subscription',
  'saas',
  'license',
  'licencia',
  'asesor',
  'developer',
  'desarroll',
];

function isServiceLike(description: string | null | undefined): boolean {
  if (!description) return false;
  const lc = description.toLowerCase();
  return SERVICE_HINTS.some((h) => lc.includes(h));
}

function operationKey(r: LedgerEntryFor349): 'E' | 'A' | 'S' | 'I' | null {
  const isSale = r.docType === 'invoice_out';
  const isPurchase = r.docType === 'invoice_in' || r.docType === 'expense';
  if (!isSale && !isPurchase) return null;
  const isService = isServiceLike(r.description);
  if (isSale) return isService ? 'S' : 'E';
  return isService ? 'I' : 'A';
}

export function quarterRangeISO349(
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

export function compute349FromLedger(input: Compute349Input): Compute349Output {
  const { from, to } = quarterRangeISO349(input.ejercicio, input.periodo);

  const intracomRows = input.ledgerRows.filter((r) => {
    if (r.entryDate < from || r.entryDate > to) return false;
    if (!isIntracomNif(r.counterpartyNif)) return false;
    // Operaciones intracom van con vatRate=0 (entregas) o sin IVA
    // español repercutido (compras con inversión sujeto pasivo).
    const rate = parseDecimal(r.vatRate);
    return rate === 0;
  });

  // Agrupar por (nifIva, clave)
  type Bucket = { importe: number; operaciones: number; nombre: string };
  const buckets = new Map<string, Bucket>();
  for (const r of intracomRows) {
    const clave = operationKey(r);
    if (!clave) continue;
    const nif = (r.counterpartyNif ?? '').trim().toUpperCase();
    const key = `${nif}|${clave}`;
    const importe = parseDecimal(r.taxBase) || parseDecimal(r.amount);
    const b = buckets.get(key) ?? {
      importe: 0,
      operaciones: 0,
      nombre: r.counterpartyName ?? '',
    };
    b.importe += importe;
    b.operaciones += 1;
    if (!b.nombre && r.counterpartyName) b.nombre = r.counterpartyName;
    buckets.set(key, b);
  }

  const lineas: Modelo349Linea[] = Array.from(buckets.entries())
    .map(([key, b]) => {
      const [nifIva, clave] = key.split('|') as [string, 'E' | 'A' | 'S' | 'I'];
      return {
        nifIva,
        nombre: b.nombre,
        clave,
        importe: round2(b.importe),
        operaciones: b.operaciones,
      };
    })
    .sort((a, b) =>
      a.clave !== b.clave ? a.clave.localeCompare(b.clave) : a.nifIva.localeCompare(b.nifIva),
    );

  const totalEntregas = round2(
    lineas.filter((l) => l.clave === 'E' || l.clave === 'S').reduce((s, l) => s + l.importe, 0),
  );
  const totalAdquisiciones = round2(
    lineas.filter((l) => l.clave === 'A' || l.clave === 'I').reduce((s, l) => s + l.importe, 0),
  );

  const advertencias: string[] = [];
  if (lineas.length === 0) {
    advertencias.push(
      'No se detectaron operaciones intracomunitarias en el periodo. Si tienes clientes/proveedores UE, verifica que sus NIF-IVA incluyan el prefijo país (PT, FR, DE, ...) y que las facturas estén registradas con vatRate=0.',
    );
  }
  const sinNombre = lineas.filter((l) => !l.nombre).length;
  if (sinNombre > 0) {
    advertencias.push(
      `${sinNombre} línea(s) sin nombre del contraparte. AEAT requiere razón social en el 349.`,
    );
  }

  return {
    skipped: false,
    result: {
      ejercicio: input.ejercicio,
      periodo: input.periodo,
      lineas,
      totalEntregas,
      totalAdquisiciones,
      totalOperaciones: lineas.reduce((s, l) => s + l.operaciones, 0),
      advertencias,
    },
  };
}
