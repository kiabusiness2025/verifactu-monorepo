// F11 fase 2 — bridge between LLM tool invocations and the Inspector AEAT.
//
// Pure (no Prisma, no LLM, no Holded). Maps the input arguments of a
// write tool into the RuleContext that the Inspector engine consumes.
// Returns null for tools the inspector doesn't cover (yet) so the
// caller skips inspection cleanly.
//
// Tested independently from the tool-loop so we can add coverage for
// new tool mappings without spinning up the LLM/Anthropic stack.

import type { RuleContext } from './inspector-aeat';

// Lightweight numeric extraction — Holded surfaces some fields as
// numbers, others as strings. We coerce to a 2-decimal string the same
// way the Holded mapper does.
function toDecimal(n: unknown): string | null {
  if (n === null || n === undefined) return null;
  if (typeof n === 'string') {
    if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
    return Number.parseFloat(n).toFixed(2);
  }
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n.toFixed(2);
}

type HoldedInvoiceItem = {
  name?: string;
  units?: number;
  subtotal?: number;
  tax?: number;
};

function holdedInvoiceTotals(items: HoldedInvoiceItem[]): {
  base: number;
  vat: number;
  total: number;
  firstTaxRate: number | null;
  description: string;
} {
  let base = 0;
  let vat = 0;
  let firstTaxRate: number | null = null;
  const names: string[] = [];
  for (const it of items) {
    const units = Number(it.units ?? 0) || 0;
    const unitPrice = Number(it.subtotal ?? 0) || 0;
    const taxRate = Number(it.tax ?? 0) || 0;
    const lineBase = units * unitPrice;
    base += lineBase;
    vat += lineBase * (taxRate / 100);
    if (firstTaxRate === null && Number.isFinite(taxRate)) firstTaxRate = taxRate;
    if (it.name) names.push(it.name);
  }
  return {
    base,
    vat,
    total: base + vat,
    firstTaxRate,
    description: names.join(', '),
  };
}

const LEDGER_TO_RULE_ACTION: Record<string, RuleContext['action'] | null> = {
  invoice_in: 'invoice_in',
  invoice_out: 'invoice_out',
  expense: 'expense',
  payroll: 'payroll',
  journal: 'journal',
  tax_payment: 'tax_payment',
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function safeDateString(v: unknown, fallback: string): string {
  if (typeof v === 'string' && ISO_DATE_REGEX.test(v)) return v;
  return fallback;
}

function todayISO(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function toolUseToRuleContext(args: {
  toolName: string;
  toolInput: unknown;
  now?: Date;
}): RuleContext | null {
  const now = args.now ?? new Date();
  const input = (args.toolInput ?? {}) as Record<string, unknown>;

  if (args.toolName === 'holded_create_invoice') {
    const items = Array.isArray(input.items)
      ? (input.items as HoldedInvoiceItem[])
      : [];
    if (items.length === 0) return null;
    const totals = holdedInvoiceTotals(items);
    return {
      action: 'invoice_out',
      data: {
        amount: totals.total.toFixed(2),
        vatBase: totals.base.toFixed(2),
        vatRate: totals.firstTaxRate !== null ? totals.firstTaxRate.toFixed(2) : null,
        vatAmount: totals.vat.toFixed(2),
        counterpartyNif: null,
        counterpartyName: typeof input.contactName === 'string' ? input.contactName : null,
        description:
          totals.description ||
          (typeof input.notes === 'string' ? input.notes : 'Factura emitida'),
        paymentMethod: null,
        date: safeDateString(input.date, todayISO(now)),
        docType: 'invoice',
      },
      now,
    };
  }

  if (args.toolName === 'isaak_ledger_create_entry') {
    const docType = String(input.docType ?? '');
    const action = LEDGER_TO_RULE_ACTION[docType];
    if (!action) return null;

    const amount = toDecimal(input.amount);
    if (amount === null) return null;
    const description = String(input.description ?? '');
    const date = safeDateString(input.entryDate, todayISO(now));

    if (action === 'tax_payment') {
      // Ledger schema doesn't carry model/period for tax_payment yet;
      // the inspector skips R020 cleanly when those are unknown.
      // The fiscal sub-agent should call a dedicated tax presentation
      // tool in a later iteration; here we expose at least a
      // tax_payment shaped context for future rules that match on
      // amount alone (e.g. retraso de ingresos).
      return {
        action: 'tax_payment',
        data: {
          model: '303', // sensible default; refined when modelo tools land
          period: 'unknown',
          amount,
        },
        now,
      };
    }
    if (action === 'journal') {
      return {
        action: 'journal',
        data: {
          description,
          amount,
          accountDebit: (input.accountDebit as string | null | undefined) ?? null,
          accountCredit: (input.accountCredit as string | null | undefined) ?? null,
        },
        now,
      };
    }
    if (action === 'payroll') {
      return {
        action: 'payroll',
        data: {
          grossAmount: amount,
          netAmount: amount,
          irpfWithheld: null,
          socialSecurityEmployee: null,
          employeeNif: (input.counterpartyNif as string | null | undefined) ?? null,
          period: (input.entryDate as string | undefined) ?? '',
        },
        now,
      };
    }

    // invoice_in / invoice_out / expense share the same shape.
    return {
      action,
      data: {
        amount,
        vatBase: toDecimal(input.taxBase),
        vatRate: typeof input.vatRate === 'string' ? input.vatRate : null,
        vatAmount: toDecimal(input.vatAmount),
        counterpartyNif: (input.counterpartyNif as string | null | undefined) ?? null,
        counterpartyName: (input.counterpartyName as string | null | undefined) ?? null,
        description,
        paymentMethod: null, // Ledger schema doesn't track method yet (future field)
        date,
      },
      now,
    };
  }

  return null;
}

// Tools whose input shapes are NOT inspected at the bridge layer.
// Documented here so adding a new fiscal write surfaces this list as a
// reminder to extend the bridge (search the codebase for this set).
export const INSPECTOR_SKIPPED_TOOLS = new Set<string>([
  'holded_register_payment', // no fiscal content beyond a pointer + amount
  'holded_create_contact', // pure CRM data
  'holded_send_document', // delivery only, content already inspected at create
  'isaak_ledger_import_holded', // per-doc inspection happens at append time (future)
]);

export function isInspectableWriteTool(toolName: string): boolean {
  if (INSPECTOR_SKIPPED_TOOLS.has(toolName)) return false;
  return toolName === 'holded_create_invoice' || toolName === 'isaak_ledger_create_entry';
}
