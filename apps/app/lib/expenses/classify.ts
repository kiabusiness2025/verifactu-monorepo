import { getExpenseCategories } from '@/lib/db-queries';

type ExpenseCategory = {
  id: number;
  code: string;
  name: string;
  is_deductible: boolean;
};

export type ExpenseDocType =
  | 'invoice'
  | 'ticket'
  | 'receipt'
  | 'bank_fee'
  | 'payroll'
  | 'other';

export type ExpenseTaxCategory =
  | 'iva_deducible'
  | 'iva_no_deducible'
  | 'suplido'
  | 'exento'
  | 'no_sujeto'
  | 'pendiente_confirmacion';

export type ExpenseClassificationSignals = {
  hasVat: boolean;
  hasTaxId: boolean;
  hasInvoiceWord: boolean;
  hasTicketWord: boolean;
  keywordsMatched: string[];
  nonDeductibleHintsMatched: string[];
};

export type ExpenseClassification = ExpenseCategory & {
  docType: ExpenseDocType;
  taxCategory: ExpenseTaxCategory;
  signals: ExpenseClassificationSignals;
};

const DOC_TYPE_KEYWORDS: Record<ExpenseDocType, string[]> = {
  bank_fee: [
    'comision',
    'comisión',
    'cuota',
    'mantenimiento',
    'transferencia',
    'tpv',
    'datafono',
    'datáfono',
    'sepa',
    'swift',
  ],
  payroll: ['nomina', 'nómina', 'seguridad social', 'tc1', 'irpf nomina', 'irpf nómina'],
  ticket: ['ticket', 'tpv', 'caja', 'datafono', 'datáfono', 'visa', 'mastercard'],
  invoice: ['factura', 'invoice', 'nif', 'cif', 'iva', 'base imponible'],
  receipt: ['recibo', 'albaran', 'albarán', 'justificante'],
  other: [],
};

const NON_DEDUCTIBLE_HINTS = ['personal', 'multa', 'multas', 'sancion', 'sanción', 'donacion', 'donación'];

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function matchAll(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function detectDocType(lower: string): { docType: ExpenseDocType; keywordsMatched: string[] } {
  const matched: string[] = [];

  const hasExplicitTicketWord = includesAny(lower, ['ticket']);
  if (hasExplicitTicketWord) {
    matched.push(...DOC_TYPE_KEYWORDS.ticket.filter((k) => lower.includes(k)));
    return { docType: 'ticket', keywordsMatched: matched };
  }

  if (includesAny(lower, DOC_TYPE_KEYWORDS.bank_fee)) {
    matched.push(...DOC_TYPE_KEYWORDS.bank_fee.filter((k) => lower.includes(k)));
    return { docType: 'bank_fee', keywordsMatched: matched };
  }

  if (includesAny(lower, DOC_TYPE_KEYWORDS.payroll)) {
    matched.push(...DOC_TYPE_KEYWORDS.payroll.filter((k) => lower.includes(k)));
    return { docType: 'payroll', keywordsMatched: matched };
  }

  const hasInvoiceWord = includesAny(lower, ['factura', 'invoice']);
  if (hasInvoiceWord || includesAny(lower, ['nif', 'cif', 'base imponible'])) {
    matched.push(...DOC_TYPE_KEYWORDS.invoice.filter((k) => lower.includes(k)));
    return { docType: 'invoice', keywordsMatched: matched };
  }

  if (includesAny(lower, DOC_TYPE_KEYWORDS.ticket)) {
    matched.push(...DOC_TYPE_KEYWORDS.ticket.filter((k) => lower.includes(k)));
    return { docType: 'ticket', keywordsMatched: matched };
  }

  if (includesAny(lower, DOC_TYPE_KEYWORDS.receipt)) {
    matched.push(...DOC_TYPE_KEYWORDS.receipt.filter((k) => lower.includes(k)));
    return { docType: 'receipt', keywordsMatched: matched };
  }

  return { docType: 'other', keywordsMatched: [] };
}

function detectTaxCategory(lower: string, docType: ExpenseDocType, hasVat: boolean): ExpenseTaxCategory {
  if (lower.includes('suplido')) return 'suplido';
  if (lower.includes('exento')) return 'exento';
  if (lower.includes('no sujeto') || lower.includes('no sujeta')) return 'no_sujeto';

  if (docType === 'bank_fee' || docType === 'payroll') {
    return 'iva_no_deducible';
  }

  if (hasVat) {
    if (includesAny(lower, NON_DEDUCTIBLE_HINTS)) return 'iva_no_deducible';
    return 'iva_deducible';
  }

  return 'pendiente_confirmacion';
}

function matchCategoryByHeuristics(categories: ExpenseCategory[], lower: string): ExpenseCategory | undefined {
  let matchedCategory = categories.find((cat) => cat.code === 'other');

  if (lower.includes('alquiler') || lower.includes('oficina')) {
    matchedCategory = categories.find((cat) => cat.code === 'office');
  } else if (
    lower.includes('software') ||
    lower.includes('suscripción') ||
    lower.includes('suscripcion') ||
    lower.includes('licencia')
  ) {
    matchedCategory = categories.find((cat) => cat.code === 'software');
  } else if (lower.includes('publicidad') || lower.includes('marketing')) {
    matchedCategory = categories.find((cat) => cat.code === 'marketing');
  } else if (lower.includes('viaje') || lower.includes('gasolina') || lower.includes('hotel')) {
    matchedCategory = categories.find((cat) => cat.code === 'travel');
  } else if (lower.includes('asesor') || lower.includes('gestor') || lower.includes('abogado')) {
    matchedCategory = categories.find((cat) => cat.code === 'professional');
  } else if (lower.includes('seguro')) {
    matchedCategory = categories.find((cat) => cat.code === 'insurance');
  } else if (lower.includes('impuesto') || lower.includes('tasa')) {
    matchedCategory = categories.find((cat) => cat.code === 'taxes');
  } else if (lower.includes('banco') || lower.includes('comisión') || lower.includes('comision')) {
    matchedCategory = categories.find((cat) => cat.code === 'banking');
  } else if (lower.includes('formación') || lower.includes('formacion') || lower.includes('curso')) {
    matchedCategory = categories.find((cat) => cat.code === 'training');
  }

  return matchedCategory;
}

export async function classifyExpense(description: string): Promise<ExpenseClassification | undefined> {
  const categories = await getExpenseCategories();
  if (!categories.length) return undefined;

  const lower = String(description || '').toLowerCase();
  const { docType, keywordsMatched } = detectDocType(lower);

  // Detecta "IVA", "21%" o "IVA 21"
  const hasVat = /\biva\b|\b(4|10|21)\s?%|\biva\s?(4|10|21)\b/.test(lower);
  const hasTaxId = /\b([A-Z]\d{7}[A-Z0-9]|\d{8}[A-Z]|[A-Z]\d{8})\b/i.test(description);
  const hasInvoiceWord = /\bfactura\b|\binvoice\b/i.test(lower);
  const hasTicketWord = /\bticket\b|\btpv\b|\bcaja\b/i.test(lower);

  const nonDeductibleHintsMatched = matchAll(lower, NON_DEDUCTIBLE_HINTS);
  const taxCategory = detectTaxCategory(lower, docType, hasVat);
  const matchedCategory = matchCategoryByHeuristics(categories, lower) || categories[0];

  return {
    ...matchedCategory,
    docType,
    taxCategory,
    signals: {
      hasVat,
      hasTaxId,
      hasInvoiceWord,
      hasTicketWord,
      keywordsMatched: [
        ...keywordsMatched,
        ...nonDeductibleHintsMatched.map((hint) => `non_deductible_hint:${hint}`),
      ],
      nonDeductibleHintsMatched,
    },
  };
}
