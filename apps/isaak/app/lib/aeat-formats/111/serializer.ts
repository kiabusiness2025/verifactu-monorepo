// Serializer Modelo 111 → BOE TXT.
//
// Casillas típicas:
//   A: Rendimientos del trabajo dinerarios (trabajadores)
//     01: Nº perceptores, 02: Importe percepciones, 03: Importe retenciones
//   B: Trabajo en especie — omitido en v1
//   C: Actividades profesionales (incluye agrícolas)
//     07: Nº perceptores, 08: Importe percepciones, 09: Importe retenciones
//   E: Total: 28 (importe retenciones), 29 (deducciones), 30 (resultado)
//
// Spec: github.com/OCA/l10n-spain/l10n_es_aeat_mod111 (XML).

import type { Modelo111Result } from '../../isaak-modelo-111-ledger';
import { loadSpecXmlAsFields } from '../xml-spec-parser';
import { renderAndEncode, type SerializeResult } from '../common';
import { SPEC_111_XML } from './spec/fields';

export type Modelo111Context = {
  companyVat: string;
  companyName: string;
  iban?: string;
  programVersion?: string;
};

let cachedFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
function getFields() {
  if (!cachedFields) cachedFields = loadSpecXmlAsFields(SPEC_111_XML);
  return cachedFields;
}

export function buildRenderContext111(
  result: Modelo111Result,
  ctx: Modelo111Context,
): Record<string, unknown> {
  return {
    company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
    'company_id.name': ctx.companyName,
    year: String(result.ejercicio),
    period_type: result.periodo,
    // Grupo A — Trabajadores
    casilla_1: result.trabajadores.perceptores,
    casilla_2: result.trabajadores.basesRetenciones,
    casilla_3: result.trabajadores.importeRetenciones,
    // Grupo C — Profesionales
    casilla_7: result.profesionales.perceptores,
    casilla_8: result.profesionales.basesRetenciones,
    casilla_9: result.profesionales.importeRetenciones,
    // Totales
    casilla_28: result.totalRetenciones,
    casilla_29: 0, // deducciones (no soportadas v1)
    casilla_30: result.resultado,
    result_type: result.resultado > 0 ? 'I' : 'N',
    iban: (ctx.iban ?? '').replace(/\s+/g, '').toUpperCase().padEnd(24, ' '),
    program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
  };
}

export function serialize111(
  result: Modelo111Result,
  ctx: Modelo111Context,
): SerializeResult {
  const fields = getFields();
  return renderAndEncode(fields, buildRenderContext111(result, ctx));
}
