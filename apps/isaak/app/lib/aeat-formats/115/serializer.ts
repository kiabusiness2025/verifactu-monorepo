// Serializer Modelo 115 → BOE TXT.
//
// Casillas:
//   01: Nº perceptores/arrendadores
//   02: Importe base retenciones (suma alquileres pagados)
//   03: Importe retenciones (19% sobre 02)
//   04: Resultados anteriores ingresos
//   05: Resultado a ingresar (= 03 - 04)
//
// Spec: github.com/OCA/l10n-spain/l10n_es_aeat_mod115 (XML).

import type { Modelo115Result } from '../../isaak-modelo-115-ledger';
import { loadSpecXmlAsFields } from '../xml-spec-parser';
import { renderAndEncode, type SerializeResult } from '../common';
import { SPEC_115_XML } from './spec/fields';

export type Modelo115Context = {
  companyVat: string;
  companyName: string;
  iban?: string;
  programVersion?: string;
};

let cachedFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
function getFields() {
  if (!cachedFields) cachedFields = loadSpecXmlAsFields(SPEC_115_XML);
  return cachedFields;
}

export function buildRenderContext115(
  result: Modelo115Result,
  ctx: Modelo115Context,
): Record<string, unknown> {
  return {
    company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
    'company_id.name': ctx.companyName,
    year: String(result.ejercicio),
    period_type: result.periodo,
    casilla_1: result.arrendadores,
    casilla_2: result.basesRetenciones,
    casilla_3: result.importeRetenciones,
    casilla_4: 0,
    casilla_5: result.resultado,
    result_type: result.resultado > 0 ? 'I' : 'N',
    iban: (ctx.iban ?? '').replace(/\s+/g, '').toUpperCase().padEnd(24, ' '),
    program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
  };
}

export function serialize115(
  result: Modelo115Result,
  ctx: Modelo115Context,
): SerializeResult {
  const fields = getFields();
  return renderAndEncode(fields, buildRenderContext115(result, ctx));
}
