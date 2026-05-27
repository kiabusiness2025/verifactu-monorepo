// Serializer Modelo 130 → BOE TXT.
//
// Estructura típica del fichero 130:
//   <T130 01000> + datos contribuyente + casillas IRPF + </T130...>
//
// Casillas estándar 130 (Régimen estimación directa):
//   01: Ingresos íntegros acumulados (1 ene → fin trim)
//   02: Gastos deducibles acumulados
//   03: Rendimiento neto previo (01 - 02)
//   04: 20% rendimiento neto (cuota previa)
//   05: Retenciones acumuladas
//   06: Pagos fraccionados previos
//   07: Resultado liquidación (a ingresar)
//
// Spec: github.com/OCA/l10n-spain/l10n_es_aeat_mod130 (XML).

import type { Modelo130Result } from '../../isaak-modelo-130-ledger';
import { loadSpecXmlAsFields } from '../xml-spec-parser';
import { renderAndEncode, type SerializeResult } from '../common';
import { SPEC_130_XML } from './spec/fields';

export type Modelo130Context = {
  companyVat: string;
  companyName: string;
  iban?: string;
  programVersion?: string;
};

let cachedFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
function getFields() {
  if (!cachedFields) cachedFields = loadSpecXmlAsFields(SPEC_130_XML);
  return cachedFields;
}

export function buildRenderContext130(
  result: Modelo130Result,
  ctx: Modelo130Context,
): Record<string, unknown> {
  return {
    company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
    'company_id.name': ctx.companyName,
    year: String(result.ejercicio),
    period_type: result.periodo,
    // Casillas oficiales
    casilla_1: result.ingresosAcumulados,
    casilla_2: result.gastosAcumulados,
    casilla_3: result.rendimientoNeto,
    casilla_4: result.cuotaPrevia,
    casilla_5: result.retencionesAcumuladas,
    casilla_6: result.ingresosACuenta,
    casilla_7: result.resultado,
    // Alias frecuentes en OCA
    ingresos_acumulados: result.ingresosAcumulados,
    gastos_acumulados: result.gastosAcumulados,
    rendimiento_neto: result.rendimientoNeto,
    pago_fraccionado_anterior: result.ingresosACuenta,
    retenciones_acumuladas: result.retencionesAcumuladas,
    result_type: result.resultado > 0 ? 'I' : 'N',
    iban: (ctx.iban ?? '').replace(/\s+/g, '').toUpperCase().padEnd(24, ' '),
    program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
  };
}

export function serialize130(
  result: Modelo130Result,
  ctx: Modelo130Context,
): SerializeResult {
  const fields = getFields();
  return renderAndEncode(fields, buildRenderContext130(result, ctx));
}
