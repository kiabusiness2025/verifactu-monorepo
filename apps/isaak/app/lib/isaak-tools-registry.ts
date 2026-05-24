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

// F2: only READ tools are exposed to the model. Write actions (create,
// register, send, archive) come in F4 behind a judge model + explicit
// confirmation handshake.
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
  options?: { only?: ToolCategoryFilter[] }
): AITool[] {
  const allow = options?.only?.length ? new Set(options.only) : null;
  const include = (cat: ToolCategoryFilter) => !allow || allow.has(cat);
  const out: AITool[] = [];

  if (include('holded') && ctx.holdedConnected && ctx.holdedApiKey) {
    for (const t of HOLDED_CHAT_TOOLS) {
      if (READ_ONLY_NAMES.has(t.name)) out.push(toAITool(t));
    }
  }
  if (include('banking') && ctx.bankConnected) {
    for (const t of BANKING_CHAT_TOOLS) {
      if (READ_ONLY_NAMES.has(t.name)) out.push(toAITool(t));
    }
  }
  if (include('google') && ctx.googleConnected) {
    for (const t of GOOGLE_CHAT_TOOLS) {
      if (READ_ONLY_NAMES.has(t.name)) out.push(toAITool(t));
    }
  }
  if (include('microsoft') && ctx.microsoftConnected) {
    for (const t of MICROSOFT_CHAT_TOOLS) {
      if (READ_ONLY_NAMES.has(t.name)) out.push(toAITool(t));
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
  ctx: IsaakToolContext
): Promise<IsaakToolExecutionResult> {
  const name = toolUse.name;
  const start = Date.now();

  if (!READ_ONLY_NAMES.has(name)) {
    return {
      toolName: name,
      toolUseId: toolUse.id,
      content: JSON.stringify({
        error: 'write_not_allowed',
        message: 'Tool not enabled in read-only mode (F2).',
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
