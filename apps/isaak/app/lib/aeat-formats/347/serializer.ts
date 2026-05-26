// Serializer Modelo 347 → BOE TXT.
//
// Estructura list-based:
//   * Registro tipo 1 (cabecera): datos declarante + totales anuales
//   * N x Registro tipo 2 (partner): una línea por contraparte con
//     NIF, nombre, naturaleza (cliente/proveedor), importe anual y
//     desglose trimestral T1/T2/T3/T4.
//
// Spec: github.com/OCA/l10n-spain/l10n_es_aeat_mod347 (XML).

import type { Modelo347Result } from '../../isaak-modelo-347-ledger';
import { loadSpecXmlAsFields } from '../xml-spec-parser';
import { renderAndEncode, type SerializeResult } from '../common';
import { SPEC_347_MAIN_XML } from './spec/fields-main';
import { SPEC_347_PARTNER_XML } from './spec/fields-partner';
import { encodeIso8859_15, renderRecord } from '../format-engine';

export type Modelo347Context = {
  companyVat: string;
  companyName: string;
  programVersion?: string;
};

let cachedMainFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
let cachedPartnerFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
function getMainFields() {
  if (!cachedMainFields) cachedMainFields = loadSpecXmlAsFields(SPEC_347_MAIN_XML);
  return cachedMainFields;
}
function getPartnerFields() {
  if (!cachedPartnerFields) {
    cachedPartnerFields = loadSpecXmlAsFields(SPEC_347_PARTNER_XML);
  }
  return cachedPartnerFields;
}

export function serialize347(
  result: Modelo347Result,
  ctx: Modelo347Context,
): SerializeResult {
  try {
    const mainFields = getMainFields();
    const partnerFields = getPartnerFields();
    const totalPartners = result.lineasClientes.length + result.lineasProveedores.length;
    const totalAmount = result.totalDeclaradoClientes + result.totalDeclaradoProveedores;

    const mainCtx: Record<string, unknown> = {
      company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
      'company_id.name': ctx.companyName,
      year: String(result.ejercicio),
      total_partner_records: totalPartners,
      total_partner_amount: totalAmount,
      program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
    };
    const mainStr = renderRecord(mainFields, mainCtx);

    // Clientes (clave B) + Proveedores (clave A) — la "clave operación"
    // del 347 usa: A=adquisición, B=entrega, C=cobros >6000€ efectivo, etc.
    const partnerStrs: string[] = [];
    for (const l of result.lineasClientes) {
      const pCtx: Record<string, unknown> = {
        company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
        year: String(result.ejercicio),
        partner_vat: l.nif,
        partner_name: l.nombre,
        operation_key: 'B', // Entregas (ventas)
        amount_untaxed: l.totalAnual,
        amount_1t: l.trimestres.T1,
        amount_2t: l.trimestres.T2,
        amount_3t: l.trimestres.T3,
        amount_4t: l.trimestres.T4,
      };
      partnerStrs.push(renderRecord(partnerFields, pCtx));
    }
    for (const l of result.lineasProveedores) {
      const pCtx: Record<string, unknown> = {
        company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
        year: String(result.ejercicio),
        partner_vat: l.nif,
        partner_name: l.nombre,
        operation_key: 'A', // Adquisiciones (compras)
        amount_untaxed: l.totalAnual,
        amount_1t: l.trimestres.T1,
        amount_2t: l.trimestres.T2,
        amount_3t: l.trimestres.T3,
        amount_4t: l.trimestres.T4,
      };
      partnerStrs.push(renderRecord(partnerFields, pCtx));
    }

    const text = mainStr + partnerStrs.join('');
    const bytes = encodeIso8859_15(text);
    return { ok: true, bytes, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
