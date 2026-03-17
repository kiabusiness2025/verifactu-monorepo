import prisma from '@/lib/prisma';
import type { Prisma } from '@verifactu/db';

export async function quoteFindMany<T extends Prisma.QuoteFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.QuoteFindManyArgs>
): Promise<Prisma.QuoteGetPayload<T>[]> {
  return prisma.quote.findMany(args);
}

export async function quoteFindFirst<T extends Prisma.QuoteFindFirstArgs>(
  args: Prisma.SelectSubset<T, Prisma.QuoteFindFirstArgs>
): Promise<Prisma.QuoteGetPayload<T> | null> {
  return prisma.quote.findFirst(args);
}

export async function quoteCreate<T extends Prisma.QuoteCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.QuoteCreateArgs>
): Promise<Prisma.QuoteGetPayload<T>> {
  return prisma.quote.create(args);
}

export async function quoteUpdate<T extends Prisma.QuoteUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.QuoteUpdateArgs>
): Promise<Prisma.QuoteGetPayload<T>> {
  return prisma.quote.update(args);
}
