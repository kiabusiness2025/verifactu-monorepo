// Generación de borradores de modelos fiscales AEAT a partir de datos Holded.
// IMPORTANTE: son ESTIMACIONES para revisión. No presentar sin verificar con asesor.

import { holdedListDocuments } from './holded-api';
import { getHoldedConnection, decryptHoldedSecret } from './holded-integration';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type Trimestre = '1T' | '2T' | '3T' | '4T';

export interface IvaTramo {
  tipo: number; // 4 | 10 | 21
  base: number;
  cuota: number;
}

export interface Modelo303Result {
  ejercicio: number;
  periodo: Trimestre;
  // Devengado (ventas)
  repercutido: IvaTramo[];
  totalDevengado: number;
  // Soportado (compras)
  soportado: IvaTramo[];
  totalSoportado: number;
  // Resultado
  resultado: number; // totalDevengado - totalSoportado
  // Metadatos
  facturas: number;
  compras: number;
  advertencias: string[];
}

export interface Modelo130Result {
  ejercicio: number;
  periodo: Trimestre;
  // Ingresos acumulados desde 1 enero hasta fin del trimestre
  ingresosAcumulados: number;
  gastosAcumulados: number;
  rendimientoNeto: number;
  cuotaPrevia: number; // 20% del rendimiento neto (mín. 0)
  // Campos que el usuario puede ajustar manualmente
  retencionesAcumuladas: number;
  ingresosACuenta: number; // pagos fraccionados trim. anteriores del año
  resultado: number;
  advertencias: string[];
}

export interface Modelo390Result {
  ejercicio: number;
  // Agregación de los 4 trimestres
  tramos: IvaTramo[];
  totalDevengado: number;
  totalSoportado: number;
  resultado: number;
  trimestresDisponibles: Trimestre[];
  advertencias: string[];
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const TIPOS_ESTANDAR = [4, 10, 21];

function quarterRange(year: number, t: Trimestre): { starttmp: string; endtmp: string } {
  const monthStart = ({ '1T': 0, '2T': 3, '3T': 6, '4T': 9 } as const)[t];
  const start = new Date(year, monthStart, 1);
  const end = new Date(year, monthStart + 3, 1);
  return {
    starttmp: String(Math.floor(start.getTime() / 1000)),
    endtmp: String(Math.floor(end.getTime() / 1000) - 1),
  };
}

function yearRange(year: number): { starttmp: string; endtmp: string } {
  return {
    starttmp: String(Math.floor(new Date(year, 0, 1).getTime() / 1000)),
    endtmp: String(Math.floor(new Date(year + 1, 0, 1).getTime() / 1000) - 1),
  };
}

function snapTipoEstandar(ratio: number): number {
  // ratio = cuota / base (ej. 0.21)
  const pct = ratio * 100;
  let closest = TIPOS_ESTANDAR[0];
  let minDist = Math.abs(pct - closest);
  for (const t of TIPOS_ESTANDAR) {
    const d = Math.abs(pct - t);
    if (d < minDist) {
      minDist = d;
      closest = t;
    }
  }
  return closest;
}

type RawDoc = Record<string, unknown>;

function extractIvaTramos(docs: RawDoc[]): IvaTramo[] {
  const acum: Record<number, { base: number; cuota: number }> = {};

  for (const doc of docs) {
    const subtotal = Number(doc.subtotal ?? doc.base ?? 0);
    const tax = Number(doc.tax ?? doc.taxAmount ?? 0);
    if (subtotal <= 0) continue;

    // Intentar leer de las líneas del documento si vienen incluidas
    const items = Array.isArray(doc.items) ? (doc.items as RawDoc[]) : [];
    if (items.length > 0) {
      for (const item of items) {
        const linBase = Number(item.subtotal ?? item.base ?? 0);
        const linTax = Number(item.tax ?? item.taxRate ?? 0);
        if (linBase <= 0 || linTax <= 0) continue;
        // item.tax puede ser la tasa (21) o el importe — si >1 es tasa, si <1 es ratio
        const tipo = linTax > 1 ? Math.round(linTax) : snapTipoEstandar(linTax);
        const cuota = linTax > 1 ? (linBase * linTax) / 100 : linBase * linTax;
        if (!acum[tipo]) acum[tipo] = { base: 0, cuota: 0 };
        acum[tipo].base += linBase;
        acum[tipo].cuota += cuota;
      }
    } else if (subtotal > 0 && tax > 0) {
      // Sin detalle de líneas: inferir tipo del ratio global
      const tipo = snapTipoEstandar(tax / subtotal);
      if (!acum[tipo]) acum[tipo] = { base: 0, cuota: 0 };
      acum[tipo].base += subtotal;
      acum[tipo].cuota += tax;
    }
  }

  return TIPOS_ESTANDAR.filter((t) => acum[t]).map((t) => ({
    tipo: t,
    base: round2(acum[t].base),
    cuota: round2(acum[t].cuota),
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function totalCuota(tramos: IvaTramo[]): number {
  return round2(tramos.reduce((s, t) => s + t.cuota, 0));
}

// ─── API pública ──────────────────────────────────────────────────────────────

async function getApiKey(tenantId: string): Promise<string> {
  const conn = await getHoldedConnection(tenantId);
  if (!conn?.apiKey) throw new Error('No hay conexión Holded activa');
  // HoldedConnectionRecord.apiKey ya viene desencriptado
  return conn.apiKey;
}

export async function generateModelo303(
  tenantId: string,
  ejercicio: number,
  periodo: Trimestre
): Promise<Modelo303Result> {
  const apiKey = await getApiKey(tenantId);
  const range = quarterRange(ejercicio, periodo);
  const advertencias: string[] = [];

  const [ventasRes, comprasRes] = await Promise.all([
    holdedListDocuments(apiKey, { docType: 'invoice', ...range, limit: 500 }),
    holdedListDocuments(apiKey, { docType: 'purchase', ...range, limit: 500 }),
  ]);

  const ventas = (ventasRes as { documents: RawDoc[] }).documents ?? [];
  const compras = (comprasRes as { documents: RawDoc[] }).documents ?? [];

  if ((ventasRes as { truncated?: boolean }).truncated) {
    advertencias.push('Hay más de 500 facturas en el trimestre. El cálculo puede ser incompleto.');
  }
  if ((comprasRes as { truncated?: boolean }).truncated) {
    advertencias.push('Hay más de 500 compras en el trimestre. El cálculo puede ser incompleto.');
  }

  const repercutido = extractIvaTramos(ventas);
  const soportado = extractIvaTramos(compras);

  const totalDevengado = totalCuota(repercutido);
  const totalSoportado = totalCuota(soportado);

  if (repercutido.length === 0) {
    advertencias.push('No se encontraron facturas de venta con IVA en el periodo.');
  }

  return {
    ejercicio,
    periodo,
    repercutido,
    totalDevengado,
    soportado,
    totalSoportado,
    resultado: round2(totalDevengado - totalSoportado),
    facturas: ventas.length,
    compras: compras.length,
    advertencias,
  };
}

export async function generateModelo130(
  tenantId: string,
  ejercicio: number,
  periodo: Trimestre,
  // Retenciones y pagos previos los introduce el usuario — no disponibles en Holded
  optsManual?: { retencionesAcumuladas?: number; ingresosACuenta?: number }
): Promise<Modelo130Result> {
  const apiKey = await getApiKey(tenantId);
  const advertencias: string[] = [];

  // Acumular desde 1 enero hasta fin del trimestre actual
  const trimEnd = quarterRange(ejercicio, periodo).endtmp;
  const yearStart = String(Math.floor(new Date(ejercicio, 0, 1).getTime() / 1000));
  const range = { starttmp: yearStart, endtmp: trimEnd };

  const [ventasRes, comprasRes] = await Promise.all([
    holdedListDocuments(apiKey, { docType: 'invoice', ...range, limit: 500 }),
    holdedListDocuments(apiKey, { docType: 'purchase', ...range, limit: 500 }),
  ]);

  const ventas = (ventasRes as { documents: RawDoc[] }).documents ?? [];
  const compras = (comprasRes as { documents: RawDoc[] }).documents ?? [];

  const ingresosAcumulados = round2(
    ventas.reduce((s, d) => s + Number(d.subtotal ?? d.base ?? 0), 0)
  );
  const gastosAcumulados = round2(
    compras.reduce((s, d) => s + Number(d.subtotal ?? d.base ?? 0), 0)
  );

  const rendimientoNeto = round2(ingresosAcumulados - gastosAcumulados);
  const cuotaPrevia = round2(Math.max(rendimientoNeto * 0.2, 0));

  const retencionesAcumuladas = optsManual?.retencionesAcumuladas ?? 0;
  const ingresosACuenta = optsManual?.ingresosACuenta ?? 0;

  advertencias.push(
    'Retenciones y pagos a cuenta previos no están disponibles en Holded. Introdúcelos manualmente.'
  );
  if (rendimientoNeto <= 0) {
    advertencias.push('Rendimiento neto negativo o cero — resultado del modelo es 0 €.');
  }

  const resultado = round2(Math.max(cuotaPrevia - retencionesAcumuladas - ingresosACuenta, 0));

  return {
    ejercicio,
    periodo,
    ingresosAcumulados,
    gastosAcumulados,
    rendimientoNeto,
    cuotaPrevia,
    retencionesAcumuladas,
    ingresosACuenta,
    resultado,
    advertencias,
  };
}

export async function generateModelo390(
  tenantId: string,
  ejercicio: number
): Promise<Modelo390Result> {
  const apiKey = await getApiKey(tenantId);
  const range = yearRange(ejercicio);
  const advertencias: string[] = [];

  const [ventasRes, comprasRes] = await Promise.all([
    holdedListDocuments(apiKey, { docType: 'invoice', ...range, limit: 500 }),
    holdedListDocuments(apiKey, { docType: 'purchase', ...range, limit: 500 }),
  ]);

  const ventas = (ventasRes as { documents: RawDoc[] }).documents ?? [];
  const compras = (comprasRes as { documents: RawDoc[] }).documents ?? [];

  const tramos = extractIvaTramos(ventas);
  const tramosSop = extractIvaTramos(compras);
  const totalDevengado = totalCuota(tramos);
  const totalSoportado = totalCuota(tramosSop);

  advertencias.push(
    'El 390 es un resumen anual informativo. Verifica que los 4 trimestres de 303 estén presentados.'
  );

  // Inferir qué trimestres tienen datos
  const trimestresDisponibles: Trimestre[] = (['1T', '2T', '3T', '4T'] as Trimestre[]).filter(
    (t) => {
      const r = quarterRange(ejercicio, t);
      return ventas.some((d) => {
        const date = Number(d.date ?? 0);
        return date >= Number(r.starttmp) && date <= Number(r.endtmp);
      });
    }
  );

  return {
    ejercicio,
    tramos,
    totalDevengado,
    totalSoportado,
    resultado: round2(totalDevengado - totalSoportado),
    trimestresDisponibles,
    advertencias,
  };
}
