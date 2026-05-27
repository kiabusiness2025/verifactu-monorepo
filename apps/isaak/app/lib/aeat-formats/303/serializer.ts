// Serializer Modelo 303 → BOE TXT.
//
// Toma el resultado del cálculo (Modelo303Result) + el contexto del
// tenant (NIF, razón social, etc.) y produce el fichero BOE en
// ISO-8859-15 que AEAT acepta en "presentación por fichero".
//
// Estructura del fichero:
//   1. Header: <T303 + 01000 + > (8 bytes)
//   2. Sub01 (régimen general/simplificado): 1581 bytes con datos del
//      contribuyente, declaración, casillas IVA devengado/soportado
//   3. AUX (info programa, NIF empresa desarrollo, reservado): ~310 bytes
//   4. Sub03 (info adicional + resultado): 1017 bytes con resultado de
//      liquidación, casilla 71, periodo, totales
//   5. Closing: </T3030YYYYPP0000> (18 bytes)
//
// El fichero resultante tiene typicamente ~3000 bytes y se guarda como
// {NIF}-303-{ejercicio}-{periodo}.303.

import type { Modelo303Result } from '../../isaak-modelo-303-ledger';
import { encodeIso8859_15, renderRecord, type FieldSpec } from '../format-engine';
import { loadSpec303 } from './spec-parser';

// Contexto que el contribuyente aporta además del cálculo del IVA.
export type Modelo303Context = {
  // NIF del declarante (9 chars: 8 dígitos + letra para autónomo,
  // o 1 letra + 7 dígitos + letra/dígito para sociedades).
  companyVat: string;
  // Razón social o "Apellidos, Nombre" del declarante (max 80 chars).
  companyName: string;
  // Si está inscrito en el registro de devolución mensual (REDEME).
  devolucionMensual?: boolean;
  // SII voluntario (declarado en censo aunque no sea obligado).
  isVoluntarySii?: boolean;
  // 4T: si está exonerado del 390 (típico autónomos con sólo IVA gral).
  exonerated390?: boolean;
  // Volumen anual ≠ 0 (relevante solo en 4T y no-exonerados 390).
  hasOperationVolume?: boolean;
  // IBAN para domiciliación/devolución (24 chars, sin espacios).
  iban?: string;
  // Versión del programa que genera el fichero (4 chars, libre).
  programVersion?: string;
};

// Construye el `ctx` que el renderRecord usa: mapea nuestro
// Modelo303Result + Modelo303Context a las propiedades que esperan los
// FieldSpec (extraídas de las expresiones Odoo).
export function buildRenderContext303(
  result: Modelo303Result,
  ctx: Modelo303Context,
): Record<string, unknown> {
  // Mapeo casilla → valor desde result.repercutido[] / result.soportado[]
  // El AEAT 303 organiza:
  //   - casilla_150/151/152: IVA 0% (intracom)
  //   - casilla_1/2/3: IVA 4%
  //   - casilla_4/5/6: IVA 10%
  //   - casilla_7/8/9: IVA 21%
  //   - casilla_153/154/155: 5%/7.5% temporal alimentos
  //   - casilla_165/166/167: IVA 2% temporal energía
  //
  // Para soportado:
  //   - casilla_28/29: bienes y servicios corrientes (base)
  //   - casilla_30/31: bienes de inversión
  //   - etc.
  //
  // En v1 mapeamos solo las casillas principales (3 tramos: 21/10/4) y
  // dejamos las temporales en 0 hasta que el usuario las necesite.

  const findBase = (tipo: number) =>
    result.repercutido.find((t) => t.tipo === tipo)?.base ?? 0;
  const findCuota = (tipo: number) =>
    result.repercutido.find((t) => t.tipo === tipo)?.cuota ?? 0;
  const findBaseSop = (tipo: number) =>
    result.soportado.find((t) => t.tipo === tipo)?.base ?? 0;
  const findCuotaSop = (tipo: number) =>
    result.soportado.find((t) => t.tipo === tipo)?.cuota ?? 0;

  // Total IVA devengado (casilla 27) y soportado deducible (casilla 45)
  const totalDevengado = result.totalDevengado;
  const totalDeducible = result.totalSoportado;
  // Resultado régimen general (casilla 46)
  const casilla_46 = totalDevengado - totalDeducible;
  // Resultado (casilla 64): solo régimen general en v1 (sin simplificado)
  const casilla_64 = casilla_46;
  // % atribuible Estado (casilla 65): 100% si no tiene foral (mayoría)
  const casilla_65 = 100;
  // Atribuible al Estado (casilla 66): casilla_64 * 65/100
  const casilla_66 = casilla_64;
  // Resultado liquidación (casilla 71)
  const casilla_71 = result.resultado;

  // Suma agregada: ventas y compras del periodo (casilla 88)
  const casilla_88 = result.repercutido.reduce((s, t) => s + t.base, 0);

  return {
    // Header / identificación
    result_type: deriveResultType(result),
    company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
    'company_id.name': ctx.companyName,
    year: String(result.ejercicio),
    period_type: result.periodo, // '1T'|'2T'|'3T'|'4T'
    devolucion_mensual: ctx.devolucionMensual ?? false,
    is_voluntary_sii: ctx.isVoluntarySii ?? false,
    exonerated_390: ctx.exonerated390 ?? false,
    has_operation_volume: ctx.hasOperationVolume ?? true,

    // IVA devengado (régimen general) — solo tramos principales en v1
    casilla_150: 0, // base IVA 0% intracom (a calcular cuando soportemos intracom)
    casilla_152: 0, // cuota IVA 0% intracom
    casilla_1: findBase(4), // base IVA 4%
    casilla_3: findCuota(4), // cuota IVA 4%
    casilla_4: findBase(10), // base IVA 10%
    casilla_6: findCuota(10), // cuota IVA 10%
    casilla_7: findBase(21), // base IVA 21%
    casilla_9: findCuota(21), // cuota IVA 21%
    // IVA temporal 5% (alimentos 2023-2024) y 2% (energía) los dejamos en 0.
    casilla_153: 0,
    casilla_155: 0,
    casilla_165: 0,
    casilla_167: 0,

    // IVA soportado deducible
    casilla_28: findBaseSop(4) + findBaseSop(10) + findBaseSop(21), // base total bienes/servicios
    casilla_29: findCuotaSop(4) + findCuotaSop(10) + findCuotaSop(21), // cuota deducible
    casilla_30: 0, // bienes inversión (no separamos en v1)
    casilla_31: 0,

    // Totales / resultado
    casilla_27: totalDevengado,
    casilla_45: totalDeducible,
    casilla_46,
    casilla_64,
    casilla_65,
    casilla_66,
    casilla_71,
    casilla_88,

    // AUX / metadatos
    program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
    iban: (ctx.iban ?? '').replace(/\s+/g, '').toUpperCase().padEnd(24, ' '),
  };
}

// El tipo de resultado se codifica en 1 char:
//   'I' = a ingresar
//   'U' = a ingresar con domiciliación
//   'D' = a devolver
//   'C' = a compensar
//   'N' = sin actividad / cero
function deriveResultType(result: Modelo303Result): string {
  if (result.resultado > 0) return 'I';
  if (result.resultado < 0) return 'C';
  return 'N';
}

// Aplica una transformación a los FieldSpec que tienen expresiones
// complejas: les añade el valor pre-computado a partir del ctx.
// Para v1 lo hacemos manual: ciertas casillas tienen lógica de
// "if exonerado_390" etc. que ya hemos resuelto en buildRenderContext303.
// Si el FieldSpec.name no se encuentra en ctx, renderField emitirá
// blancos / ceros por defecto.

export function serialize303(
  result: Modelo303Result,
  ctx: Modelo303Context,
): { ok: true; bytes: Buffer; text: string } | { ok: false; error: string } {
  try {
    const { sub01, sub03 } = loadSpec303('2024-10');
    const renderCtx = buildRenderContext303(result, ctx);

    // Render sub01 (página 1)
    const sub01Str = renderRecord(sub01, renderCtx);
    // Render sub03 (página 3 — info adicional + resultado)
    const sub03Str = renderRecord(sub03, renderCtx);

    // Por v1 NO incluimos el bloque <AUX> ni el wrapping completo del
    // main_export_config; esto se hace en C-B1.c cuando integremos
    // con el WS de presentación SOAP. El sub01+sub03 ya es el "cuerpo
    // de las páginas" que es lo que importa para el cálculo.
    const text = sub01Str + sub03Str;
    const bytes = encodeIso8859_15(text);

    return { ok: true, bytes, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Helper: nombre canónico del fichero según convención AEAT
export function filename303(nif: string, ejercicio: number, periodo: string): string {
  return `${nif.toUpperCase()}-303-${ejercicio}-${periodo}.303`;
}

// Re-export para tests
export { type FieldSpec };
