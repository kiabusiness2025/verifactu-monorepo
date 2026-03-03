import prisma from '@/lib/prisma';

export type QuoteCustomer = {
  id: string;
  name: string;
  nif: string | null;
  email: string | null;
};

export type QuoteRow = {
  id: string;
  tenantId: string;
  number: string;
  status: string;
  issueDate: Date;
  validUntil: Date | null;
  customerId: string;
  currency: string;
  lines: unknown;
  totals: unknown;
  notes: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: QuoteCustomer;
};

type QuoteModel = {
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
};

function getQuoteModel(): QuoteModel {
  return (prisma as unknown as { quote: QuoteModel }).quote;
}

export async function quoteFindFirst(args: unknown): Promise<QuoteRow | null> {
  const row = await getQuoteModel().findFirst(args);
  return (row as QuoteRow | null) ?? null;
}

export async function quoteFindMany(args: unknown): Promise<QuoteRow[]> {
  const rows = await getQuoteModel().findMany(args);
  return Array.isArray(rows) ? (rows as QuoteRow[]) : [];
}

export async function quoteCreate(args: unknown): Promise<QuoteRow> {
  return (await getQuoteModel().create(args)) as QuoteRow;
}

export async function quoteUpdate(args: unknown): Promise<QuoteRow> {
  return (await getQuoteModel().update(args)) as QuoteRow;
}

export async function quoteUpdateMany(args: unknown): Promise<{ count: number }> {
  const result = (await getQuoteModel().updateMany(args)) as { count?: unknown };
  return { count: typeof result.count === 'number' ? result.count : 0 };
}
