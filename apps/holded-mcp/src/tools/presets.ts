/**
 * Tool presets para el servidor MCP de Claude.
 *
 * Histórico:
 *   - Antes del 2026-05-18: el servidor exponía las 24 tools registradas en
 *     `registerProductionTools`. No había mecanismo de filtrado.
 *   - 2026-05-18 (tarde): decisión de producto de alinear con el conector
 *     ChatGPT que solo expone 10 tools (invoicing + contabilidad). El MCP de
 *     Claude expone 8 tools equivalentes (Claude usa `list_documents`
 *     polimórfico para invoices + purchases, por eso 8 y no 10).
 *
 * Por qué un preset por env var en vez de borrar el código:
 *   - El código de las 16 tools "extra" se queda funcional pero no expuesto
 *     al usuario. Cuando OpenAI/Anthropic aprueben la submission v2, basta
 *     con cambiar el preset a `full` (vía env var) para reactivarlas como
 *     submission v3 sin reescribir nada.
 *   - PATs y smoke tests internos pueden seguir usando `full` localmente.
 *
 * Whitelist actual `submission_v1` (8 tools):
 *   - list_documents, get_document, get_document_pdf (cubre invoice + purchase)
 *   - list_contacts, get_contact
 *   - get_chart_of_accounts, get_journal
 *   - create_invoice_draft (única write, requiere includeWriteTools)
 *
 * Eliminadas vs `full`:
 *   - get_daily_book (duplicado conceptual de get_journal)
 *   - list_warehouses, list_products, list_products_stock, get_product
 *   - list_employees, get_employee
 *   - list_treasury_accounts
 *   - list_taxes, list_numbering_series
 *   - list_projects, get_project, list_project_tasks, list_time_records
 *   - list_crm_funnels, list_leads
 */

export type HoldedMcpToolPreset = 'submission_v1' | 'full';

export const SUBMISSION_V1_TOOLS = [
  'list_documents',
  'get_document',
  'get_document_pdf',
  'list_contacts',
  'get_contact',
  'get_chart_of_accounts',
  'get_journal',
  'create_invoice_draft',
] as const;

export function isHoldedMcpToolPreset(value: string | undefined): value is HoldedMcpToolPreset {
  return value === 'submission_v1' || value === 'full';
}

/**
 * Resuelve el preset activo desde env var (`HOLDED_MCP_TOOL_PRESET`). Cualquier
 * valor no reconocido se ignora y se vuelve al default `submission_v1`. En
 * producción esto es defensivo: si alguien setea por error la env var a algo
 * incorrecto, no exponemos accidentalmente tools fuera de la submission.
 */
export function getActiveToolPreset(): HoldedMcpToolPreset {
  const raw = process.env.HOLDED_MCP_TOOL_PRESET?.trim();
  if (raw && isHoldedMcpToolPreset(raw)) return raw;
  return 'submission_v1';
}

/**
 * Devuelve la whitelist de tools permitidas para un preset. Cuando es `full`
 * retorna `null` (sentinel para "no filtrar, registrar todas").
 */
export function getAllowedToolsForPreset(preset: HoldedMcpToolPreset): Set<string> | null {
  if (preset === 'full') return null;
  return new Set(SUBMISSION_V1_TOOLS);
}
