import type { AITool, AIToolUse } from '@verifactu/utils';
import {
  HOLDED_CHAT_TOOLS,
  executeHoldedTool,
  type HoldedToolName,
} from './holded-tools';
import {
  BANKING_CHAT_TOOLS,
  executeBankingTool,
  isBankingToolName,
} from './banking-tools';
import {
  GOOGLE_CHAT_TOOLS,
  executeGoogleTool,
  isGoogleToolName,
} from './google-tools';
import {
  MICROSOFT_CHAT_TOOLS,
  executeMicrosoftTool,
  isMicrosoftToolName,
} from './microsoft-tools';

// F4: write actions allowed when allowWrites=true. Every write call goes
// through the GPT-4o-mini judge before execution. The judge can allow,
// block, or require user confirmation. Reads stay always-on for F2/F3.
const WRITE_TOOL_NAMES = new Set<string>([
  // Holded write
  'holded_create_invoice',
  'holded_register_payment',
  'holded_create_contact',
  'holded_send_document',
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
  'holded_list_treasury_accounts',
  'holded_list_products',
  'holded_list_projects',
  'holded_list_employees',
  'holded_get_verifactu_status',
  'holded_get_pnl',
  'holded_list_payments',
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
  // Microsoft (read-only subset)
  'microsoft_check_connection',
  'microsoft_calendar_list_events',
  'microsoft_mail_scan_invoices',
  'microsoft_drive_list_files',
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
};

export type ToolCategoryFilter = 'holded' | 'banking' | 'google' | 'microsoft';

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
  const isAllowed =
    READ_ONLY_NAMES.has(name) || (allowWrites && WRITE_TOOL_NAMES.has(name));

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
    if (isBankingToolName(name)) {
      result = await executeBankingTool(ctx.tenantId, name, toolUse.input);
    } else if (isGoogleToolName(name)) {
      result = await executeGoogleTool(ctx.tenantId, ctx.userId, name, toolUse.input);
    } else if (isMicrosoftToolName(name)) {
      result = await executeMicrosoftTool(ctx.tenantId, ctx.userId, name, toolUse.input);
    } else if (ctx.holdedApiKey) {
      result = await executeHoldedTool(
        ctx.holdedApiKey,
        name as HoldedToolName,
        toolUse.input
      );
    } else {
      result = { error: 'holded_not_connected', message: 'No Holded API key in context.' };
    }

    return {
      toolName: name,
      toolUseId: toolUse.id,
      content: JSON.stringify(result),
      isError: false,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      toolName: name,
      toolUseId: toolUse.id,
      content: JSON.stringify({ error: 'tool_failed', message: msg }),
      isError: true,
      latencyMs: Date.now() - start,
    };
  }
}
