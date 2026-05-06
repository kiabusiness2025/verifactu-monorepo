import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { Prisma } from '@verifactu/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_STATUS = new Set(['all', 'unmatched', 'reconciled']);

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const from = request.nextUrl.searchParams.get('from') || undefined;
  const to = request.nextUrl.searchParams.get('to') || undefined;
  const accountId = request.nextUrl.searchParams.get('accountId') || undefined;
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const statusParam = request.nextUrl.searchParams.get('status') || 'unmatched';
  const status = ALLOWED_STATUS.has(statusParam) ? statusParam : 'unmatched';
  const parsedLimit = Number(request.nextUrl.searchParams.get('limit') || 100);
  const limit = Number.isFinite(parsedLimit) ? Math.min(200, Math.max(1, parsedLimit)) : 100;

  const baseWhere: Prisma.SeTransactionWhereInput = {
    tenantId: auth.tenantId,
    duplicated: false,
    ...(from || to
      ? {
          madeOn: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(accountId ? { accountId } : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query, mode: 'insensitive' } },
            { payee: { contains: query, mode: 'insensitive' } },
            { payer: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const statusWhere: Prisma.SeTransactionWhereInput =
    status === 'reconciled'
      ? { reconciledAt: { not: null } }
      : status === 'unmatched'
        ? { reconciledAt: null }
        : {};

  const items = await prisma.seTransaction.findMany({
    where: {
      ...baseWhere,
      ...statusWhere,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          iban: true,
          currency: true,
        },
      },
    },
    orderBy: [{ madeOn: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  const [unmatched, reconciled] = await Promise.all([
    prisma.seTransaction.count({
      where: {
        ...baseWhere,
        reconciledAt: null,
      },
    }),
    prisma.seTransaction.count({
      where: {
        ...baseWhere,
        reconciledAt: { not: null },
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((tx) => ({
      id: tx.id,
      date: tx.madeOn,
      amount: Number(tx.amount),
      currency: tx.currency,
      description: tx.description,
      category: tx.category,
      payee: tx.payee,
      payer: tx.payer,
      account: tx.account,
      reconciled: Boolean(tx.reconciledAt),
      reconciledAt: tx.reconciledAt,
    })),
    source: 'saltedge',
    status,
    from,
    to,
    summary: {
      unmatched,
      reconciled,
      total: unmatched + reconciled,
    },
  });
}
