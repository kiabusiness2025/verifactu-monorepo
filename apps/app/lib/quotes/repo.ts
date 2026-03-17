import prisma from '@/lib/prisma';

type QuoteDelegate = typeof prisma.quote;

type FindManyArgs = Parameters<QuoteDelegate['findMany']>[0];
type FindFirstArgs = Parameters<QuoteDelegate['findFirst']>[0];
type CreateArgs = Parameters<QuoteDelegate['create']>[0];
type UpdateArgs = Parameters<QuoteDelegate['update']>[0];

export async function quoteFindMany(args: FindManyArgs) {
  return prisma.quote.findMany(args);
}

export async function quoteFindFirst(args: FindFirstArgs) {
  return prisma.quote.findFirst(args);
}

export async function quoteCreate(args: CreateArgs) {
  return prisma.quote.create(args);
}

export async function quoteUpdate(args: UpdateArgs) {
  return prisma.quote.update(args);
}
