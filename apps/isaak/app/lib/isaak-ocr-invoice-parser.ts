// Pure parser for GPT-4o invoice OCR output. Separated from the caller so
// unit tests don't pull @verifactu/utils through babel-jest.

export type InvoiceLineItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
};

export type InvoiceTax = {
  rate: number | null; // 21, 10, 4, 0...
  base: number | null;
  amount: number | null;
};

export type InvoiceExtraction = {
  vendor: {
    name: string | null;
    taxId: string | null; // CIF / NIF / VAT
  };
  customer: {
    name: string | null;
    taxId: string | null;
  };
  invoiceNumber: string | null;
  issueDate: string | null; // ISO yyyy-mm-dd
  dueDate: string | null;
  currency: string | null; // ISO 4217
  subtotal: number | null;
  taxes: InvoiceTax[];
  total: number | null;
  lines: InvoiceLineItem[];
  notes: string | null;
  confidence: number; // 0..1, model's self-reported confidence
  modelUsed: string;
  latencyMs: number;
  parseError?: string;
};

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    // Handle European comma decimals: "1.234,56" → 1234.56
    const cleaned = value
      .replace(/\s/g, '')
      .replace(/[€$£]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '') // strip thousands dots
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDate(value: unknown): string | null {
  const str = toStringOrNull(value);
  if (!str) return null;
  // Already ISO-ish?
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // dd/mm/yyyy or dd-mm-yyyy
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function emptyExtraction(reason: string, model: string, latencyMs: number): InvoiceExtraction {
  return {
    vendor: { name: null, taxId: null },
    customer: { name: null, taxId: null },
    invoiceNumber: null,
    issueDate: null,
    dueDate: null,
    currency: null,
    subtotal: null,
    taxes: [],
    total: null,
    lines: [],
    notes: null,
    confidence: 0,
    modelUsed: model,
    latencyMs,
    parseError: reason,
  };
}

function parseLines(input: unknown): InvoiceLineItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row): InvoiceLineItem | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const description = toStringOrNull(r.description);
      if (!description) return null;
      return {
        description,
        quantity: toNumberOrNull(r.quantity),
        unitPrice: toNumberOrNull(r.unitPrice ?? r.unit_price ?? r.price),
        amount: toNumberOrNull(r.amount ?? r.total ?? r.subtotal),
      };
    })
    .filter((row): row is InvoiceLineItem => row !== null)
    .slice(0, 50);
}

function parseTaxes(input: unknown): InvoiceTax[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row): InvoiceTax | null => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const rate = toNumberOrNull(r.rate ?? r.percent ?? r.percentage);
      const base = toNumberOrNull(r.base ?? r.taxableBase ?? r.taxable_base);
      const amount = toNumberOrNull(r.amount ?? r.tax ?? r.taxAmount);
      if (rate === null && base === null && amount === null) return null;
      return { rate, base, amount };
    })
    .filter((row): row is InvoiceTax => row !== null)
    .slice(0, 10);
}

function parseConfidence(value: unknown): number {
  const num = toNumberOrNull(value);
  if (num === null) return 0;
  if (num < 0) return 0;
  if (num > 1) return Math.min(1, num / 100); // tolerate "85" instead of 0.85
  return num;
}

export function parseInvoiceJson(
  rawText: string,
  model: string,
  latencyMs: number
): InvoiceExtraction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch {
    return emptyExtraction('invalid_json', model, latencyMs);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return emptyExtraction('not_object', model, latencyMs);
  }
  const obj = parsed as Record<string, unknown>;
  const vendor = (obj.vendor as Record<string, unknown>) ?? {};
  const customer = (obj.customer as Record<string, unknown>) ?? {};

  return {
    vendor: {
      name: toStringOrNull(vendor.name),
      taxId: toStringOrNull(vendor.taxId ?? vendor.tax_id ?? vendor.cif ?? vendor.nif),
    },
    customer: {
      name: toStringOrNull(customer.name),
      taxId: toStringOrNull(customer.taxId ?? customer.tax_id ?? customer.cif ?? customer.nif),
    },
    invoiceNumber: toStringOrNull(obj.invoiceNumber ?? obj.invoice_number ?? obj.number),
    issueDate: toIsoDate(obj.issueDate ?? obj.issue_date ?? obj.date),
    dueDate: toIsoDate(obj.dueDate ?? obj.due_date),
    currency: toStringOrNull(obj.currency),
    subtotal: toNumberOrNull(obj.subtotal ?? obj.base ?? obj.net),
    taxes: parseTaxes(obj.taxes ?? obj.vat),
    total: toNumberOrNull(obj.total ?? obj.grandTotal ?? obj.grand_total),
    lines: parseLines(obj.lines ?? obj.items ?? obj.lineItems),
    notes: toStringOrNull(obj.notes ?? obj.comments),
    confidence: parseConfidence(obj.confidence),
    modelUsed: model,
    latencyMs,
  };
}
