export const EXPENSE_SOURCES = ['pdf', 'photo', 'excel', 'voice', 'manual', 'isaak'] as const;

export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

export type CanonicalExpenseInput = {
  tenantId: string;
  date: string;
  description: string;
  amount: number;
  taxRate?: number;
  categoryId?: number;
  categoryName?: string;
  deductible?: boolean;
  reference?: string;
  notes?: string;
  source?: ExpenseSource;
};

export type CanonicalExpense = {
  tenantId: string;
  date: string;
  description: string;
  amount: number;
  taxRate: number;
  categoryId?: number;
  categoryName?: string;
  deductible?: boolean;
  reference?: string;
  notes?: string;
  source: ExpenseSource;
};

export function normalizeCanonicalExpense(input: CanonicalExpenseInput): CanonicalExpense {
  if (!input.tenantId) {
    throw new Error('Missing tenantId');
  }

  if (!input.date) {
    throw new Error('Missing date');
  }

  const parsedDate = new Date(input.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date');
  }

  if (!input.description || !input.description.trim()) {
    throw new Error('Missing description');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Invalid amount');
  }

  const normalizedSource = EXPENSE_SOURCES.includes(input.source ?? 'manual')
    ? (input.source ?? 'manual')
    : 'manual';

  return {
    tenantId: input.tenantId,
    date: parsedDate.toISOString().split('T')[0],
    description: input.description.trim(),
    amount: input.amount,
    taxRate: Number.isFinite(input.taxRate) ? (input.taxRate as number) : 0.21,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    deductible: input.deductible,
    reference: input.reference?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    source: normalizedSource,
  };
}
