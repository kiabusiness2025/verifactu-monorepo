export interface ChartPayload {
  type: 'line' | 'bar' | 'area' | 'pie';
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
}

export interface CardPayload {
  type: 'invoice_list' | 'contact' | 'project' | 'tax_summary' | 'treasury' | 'ocr_result';
  data: Record<string, unknown>;
  actions?: Array<{ label: string; action: string; payload?: unknown }>;
}

export interface ToolCallEntry {
  name: string;
  input: unknown;
  result: unknown;
}

export function formatResponsePayload(
  toolCallLog: ToolCallEntry[],
  _reply: string
): { chartPayload?: ChartPayload; cardPayload?: CardPayload } {
  // List of invoices with multiple records → bar chart grouped by month
  const docsTool = toolCallLog.find((t) => t.name === 'holded_list_documents');
  if (docsTool?.result && Array.isArray(docsTool.result) && docsTool.result.length > 3) {
    const docs = docsTool.result as Array<{
      date?: string;
      docDate?: number;
      total?: number;
      amount?: number;
    }>;
    const byMonth = groupByMonth(docs);
    if (byMonth.length > 1) {
      return {
        chartPayload: {
          type: 'bar',
          title: 'Facturación por mes',
          data: byMonth,
          xKey: 'month',
          yKeys: ['total'],
        },
      };
    }
  }

  // Treasury accounts → card
  const treasuryTool = toolCallLog.find((t) => t.name === 'holded_list_treasury_accounts');
  if (treasuryTool?.result && Array.isArray(treasuryTool.result)) {
    return {
      cardPayload: {
        type: 'treasury',
        data: { accounts: treasuryTool.result },
      },
    };
  }

  // Single contact → card
  const contactTool = toolCallLog.find((t) => t.name === 'holded_get_contact');
  if (contactTool?.result) {
    return {
      cardPayload: {
        type: 'contact',
        data: contactTool.result as Record<string, unknown>,
      },
    };
  }

  return {};
}

function groupByMonth(
  docs: Array<{ date?: string; docDate?: number; total?: number; amount?: number }>
) {
  const map = new Map<string, number>();

  for (const doc of docs) {
    // Holded dates can come as ISO string or Unix timestamp (seconds)
    let month: string;
    if (typeof doc.date === 'string') {
      month = doc.date.slice(0, 7);
    } else if (typeof doc.docDate === 'number') {
      month = new Date(doc.docDate * 1000).toISOString().slice(0, 7);
    } else {
      continue;
    }

    const amount = doc.total ?? doc.amount ?? 0;
    map.set(month, (map.get(month) ?? 0) + amount);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}
