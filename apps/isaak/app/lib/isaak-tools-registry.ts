import type { AITool, AIToolUse } from '@verifactu/utils';
import { HOLDED_CHAT_TOOLS, executeHoldedTool, type HoldedToolName } from './holded-tools';
import { BANKING_CHAT_TOOLS, executeBankingTool, isBankingToolName } from './banking-tools';
import { GOOGLE_CHAT_TOOLS, executeGoogleTool, isGoogleToolName } from './google-tools';
import { MICROSOFT_CHAT_TOOLS, executeMicrosoftTool, isMicrosoftToolName } from './microsoft-tools';
import {
  LEDGER_CHAT_TOOLS,
  executeLedgerTool,
  isLedgerToolName,
  type LedgerToolName,
} from './isaak-ledger-tools';
import {
  SECTOR_CHAT_TOOLS,
  executeSectorTool,
  isSectorToolName,
  type SectorToolName,
} from './sector-tools';
import {
  LEGAL_CHAT_TOOLS,
  executeLegalTool,
  isLegalToolName,
  type LegalToolName,
} from './isaak-legal-tools';
import {
  MEMORY_CHAT_TOOLS,
  executeMemoryTool,
  isMemoryToolName,
  type MemoryToolName,
} from './isaak-memory-tools';
import { emitWebhookEvent, type IsaakWebhookEventType } from './isaak-webhook-emitter';

// Mapping: write tool name → webhook event type emitted on success.
const WRITE_TOOL_WEBHOOK_MAP: Partial<Record<string, IsaakWebhookEventType>> = {
  holded_create_invoice_draft: 'invoice.created',
  holded_send_document: 'invoice.sent',
  holded_register_payment: 'payment.registered',
  isaak_submit_303: 'tax_return.submitted',
  isaak_submit_130: 'tax_return.submitted',
  isaak_submit_111: 'tax_return.submitted',
  isaak_submit_115: 'tax_return.submitted',
  isaak_submit_180: 'tax_return.submitted',
  isaak_submit_190: 'tax_return.submitted',
  isaak_submit_347: 'tax_return.submitted',
  isaak_submit_349: 'tax_return.submitted',
  isaak_record_tax_return: 'tax_return.submitted',
};

// F4: write actions allowed when allowWrites=true. Every write call goes
// through the GPT-4o-mini judge before execution. The judge can allow,
// block, or require user confirmation. Reads stay always-on for F2/F3.
const WRITE_TOOL_NAMES = new Set<string>([
  // Holded write
  // V1 LAUNCH: create_invoice → create_invoice_draft (no emite, queda borrador).
  'holded_create_invoice_draft',
  'holded_register_payment',
  'holded_create_contact',
  'holded_send_document',
  // Isaak Ledger write (F9 / F11 fase 4 / C-A)
  'isaak_ledger_create_entry',
  'isaak_ledger_import_holded',
  'isaak_record_tax_return',
  'isaak_set_fiscal_profile',
  'isaak_sync_aeat_sede',
  'isaak_compute_303_draft',
  'isaak_submit_303',
  'isaak_compute_130_draft',
  'isaak_submit_130',
  'isaak_compute_111_draft',
  'isaak_submit_111',
  'isaak_compute_349_draft',
  'isaak_submit_349',
  'isaak_compute_347_draft',
  'isaak_submit_347',
  'isaak_compute_115_draft',
  'isaak_submit_115',
  'isaak_compute_180_draft',
  'isaak_submit_180',
  'isaak_compute_190_draft',
  'isaak_submit_190',
  // Google write (NOT enabled in F4 v1 — kept for visibility / future)
  // 'google_calendar_create_event', 'google_calendar_update_event',
  // 'google_calendar_delete_event', 'google_gmail_archive',
  // Microsoft write (NOT enabled in F4 v1)
  // 'microsoft_calendar_create_event', 'microsoft_calendar_update_event',
  // 'microsoft_calendar_delete_event', 'microsoft_mail_archive',
  // 'microsoft_mail_send',
]);

export function isWriteToolName(name: string): boolean {
  return WRITE_TOOL_NAMES.has(name);
}

// F2: only READ tools are exposed when allowWrites=false.
const READ_ONLY_NAMES = new Set<string>([
  // Holded
  'holded_list_documents',
  'holded_get_document',
  'holded_list_contacts',
  'holded_get_contact',
  'holded_get_chart_of_accounts',
  'holded_get_journal',
  'holded_get_daily_book',
  'holded_list_treasury_accounts',
  'holded_list_products',
  'holded_list_projects',
  'holded_list_employees',
  'holded_get_verifactu_status',
  'holded_get_pnl',
  'holded_list_payments',
  'holded_list_taxes',
  'holded_list_numbering_series',
  'holded_get_document_pdf',
  // Banking
  'banking_check_connection',
  'banking_list_accounts',
  'banking_list_transactions',
  'banking_get_cash_summary',
  'banking_get_cash_forecast',
  'banking_get_reconciliation_status',
  // Google (read-only subset)
  'google_check_connection',
  'google_calendar_list_events',
  'google_gmail_scan_invoices',
  'google_drive_list_files',
  // Isaak Ledger reads (F11 fase 3 / F10 / fase 4 / C-A / fase 5)
  'isaak_audit_ledger',
  'isaak_export_ledger_excel',
  'isaak_generate_visual_report',
  'isaak_export_pdf',
  'isaak_export_word',
  'isaak_list_tax_returns',
  'isaak_list_aeat_notifications',
  'isaak_list_aeat_census_changes',
  'isaak_summarize_aeat_inbox',
  'isaak_validate_vat_intracom',
  'isaak_get_fiscal_profile',
  'isaak_ledger_get_balances',
  'inspector_search_aeat',
  'inspector_consult',
  // Microsoft (read-only subset)
  'microsoft_check_connection',
  'microsoft_calendar_list_events',
  'microsoft_mail_scan_invoices',
  'microsoft_drive_list_files',
  // Sector software (HotelGest, Loyverse, Revo XEF, WooCommerce, etc.)
  'sector_check_connection',
  'sector_get_snapshot',
  'sector_list_invoices',
  'sector_list_contacts',
  'sector_list_products',
  // V1.2 — Legal (sub-agente revisión de contratos, read-only)
  'isaak_review_contract',
  // V1.2 — Memory (escritura sobre tabla privada del usuario, sin efecto
  // en sistemas externos — no pasa por el judge).
  'isaak_remember',
  'isaak_forget',
]);

type AnthropicToolDef = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

function toAITool(t: AnthropicToolDef): AITool {
  return { name: t.name, description: t.description, input_schema: t.input_schema };
}

export type IsaakToolContext = {
  tenantId: string;
  userId: string;
  holdedApiKey?: string | null;
  holdedConnected: boolean;
  bankConnected: boolean;
  googleConnected: boolean;
  microsoftConnected: boolean;
  sectorConnected: boolean;
};

export type ToolCategoryFilter =
  | 'holded'
  | 'banking'
  | 'google'
  | 'microsoft'
  | 'ledger'
  | 'sector'
  | 'legal'
  | 'memory';

export function buildReadOnlyToolsForContext(
  ctx: IsaakToolContext,
  options?: { only?: ToolCategoryFilter[]; allowWrites?: boolean }
): AITool[] {
  const allow = options?.only?.length ? new Set(options.only) : null;
  const include = (cat: ToolCategoryFilter) => !allow || allow.has(cat);
  const allowWrites = options?.allowWrites === true;
  const isAllowed = (name: string) =>
    READ_ONLY_NAMES.has(name) || (allowWrites && WRITE_TOOL_NAMES.has(name));
  const out: AITool[] = [];

  if (include('holded') && ctx.holdedConnected && ctx.holdedApiKey) {
    for (const t of HOLDED_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  if (include('banking') && ctx.bankConnected) {
    for (const t of BANKING_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  if (include('google') && ctx.googleConnected) {
    for (const t of GOOGLE_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  if (include('microsoft') && ctx.microsoftConnected) {
    for (const t of MICROSOFT_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  // F9: Ledger tools are gated only by tenant auth (always available
  // when the chat session is authenticated). isaak_ledger_import_holded
  // surfaces a clean "holded_not_connected" error at runtime if no key.
  if (include('ledger')) {
    for (const t of LEDGER_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  if (include('sector') && ctx.sectorConnected) {
    for (const t of SECTOR_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  // V1.2: Sub-agente Asesor Legal — siempre disponible (incl. Free).
  if (include('legal')) {
    for (const t of LEGAL_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }
  // V1.2: Memoria a largo plazo. Read (retrieve) ya se inyecta al system
  // prompt; aquí exponemos write (remember) y delete (forget) al LLM.
  if (include('memory')) {
    for (const t of MEMORY_CHAT_TOOLS) {
      if (isAllowed(t.name)) out.push(toAITool(t));
    }
  }

  return out;
}

export type IsaakToolExecutionResult = {
  toolName: string;
  toolUseId: string;
  content: string;
  isError: boolean;
  latencyMs: number;
};

export async function executeIsaakTool(
  toolUse: AIToolUse,
  ctx: IsaakToolContext,
  options?: { allowWrites?: boolean }
): Promise<IsaakToolExecutionResult> {
  const name = toolUse.name;
  const start = Date.now();
  const allowWrites = options?.allowWrites === true;
  const isAllowed = READ_ONLY_NAMES.has(name) || (allowWrites && WRITE_TOOL_NAMES.has(name));

  if (!isAllowed) {
    return {
      toolName: name,
      toolUseId: toolUse.id,
      content: JSON.stringify({
        error: WRITE_TOOL_NAMES.has(name) ? 'write_not_allowed_in_this_session' : 'unknown_tool',
        message: WRITE_TOOL_NAMES.has(name)
          ? 'Esta tool de escritura no está habilitada en esta sesión. Pide al usuario que confirme la acción y vuelve a intentarlo.'
          : 'Tool desconocida.',
      }),
      isError: true,
      latencyMs: Date.now() - start,
    };
  }

  try {
    let result: unknown;
    if (isMemoryToolName(name)) {
      result = await executeMemoryTool(
        { tenantId: ctx.tenantId, userId: ctx.userId },
        name as MemoryToolName,
        toolUse.input
      );
    } else if (isLegalToolName(name)) {
      result = await executeLegalTool(
        { tenantId: ctx.tenantId, userId: ctx.userId },
        name as LegalToolName,
        toolUse.input
      );
    } else if (isSectorToolName(name)) {
      result = await executeSectorTool(ctx.tenantId, name as SectorToolName, toolUse.input);
    } else if (isLedgerToolName(name)) {
      result = await executeLedgerTool(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          holdedApiKey: ctx.holdedApiKey ?? null,
        },
        name as LedgerToolName,
        toolUse.input
      );
    } else if (isBankingToolName(name)) {
      result = await executeBankingTool(ctx.tenantId, name, toolUse.input);
    } else if (isGoogleToolName(name)) {
      result = await executeGoogleTool(ctx.tenantId, ctx.userId, name, toolUse.input);
    } else if (isMicrosoftToolName(name)) {
      result = await executeMicrosoftTool(ctx.tenantId, ctx.userId, name, toolUse.input);
    } else if (ctx.holdedApiKey) {
      result = await executeHoldedTool(ctx.holdedApiKey, name as HoldedToolName, toolUse.input);
    } else {
      result = { error: 'holded_not_connected', message: 'No Holded API key in context.' };
    }

    // D1: fire webhook event for successful writes (fire-and-forget — never blocks the response).
    const webhookEvent = WRITE_TOOL_WEBHOOK_MAP[name];
    if (webhookEvent) {
      const r = result as Record<string, unknown>;
      if (r.ok === true || r.success === true) {
        void emitWebhookEvent(ctx.tenantId, webhookEvent, { toolName: name, ...r }).catch((e) =>
          console.error('[webhook] emitWebhookEvent failed', e)
        );
      }
    }

    const latencyMs = Date.now() - start;
    // V1.4 — telemetría por tool individual (fire-and-forget).
    try {
      const { logEvent } = await import('./isaak-telemetry');
      logEvent({
        event: 'tool.exec',
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        toolName: name,
        latencyMs,
        ok: true,
      });
    } catch {
      /* fail-silent — la observability nunca rompe ejecución */
    }
    return {
      toolName: name,
      toolUseId: toolUse.id,
      content: JSON.stringify(result),
      isError: false,
      latencyMs,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const latencyMs = Date.now() - start;
    try {
      const { logError } = await import('./isaak-telemetry');
      logError({
        event: 'tool.exec',
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        toolName: name,
        latencyMs,
        ok: false,
        error: msg,
      });
    } catch {
      /* fail-silent */
    }
    return {
      toolName: name,
      toolUseId: toolUse.id,
      content: JSON.stringify({ error: 'tool_failed', message: msg }),
      isError: true,
      latencyMs,
    };
  }
}
