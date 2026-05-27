// L4-L5 — Wrapper Prisma para saldos PGC.
//
// Separa la query asíncrona del módulo puro `isaak-ledger-balances.ts`
// para que los tests del SQL builder no arrastren Prisma.

import { prisma } from './prisma';
import {
  buildAccountBalancesSQL,
  classifyBalances,
  type AccountBalance,
} from './isaak-ledger-balances';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function computeAccountBalances(input: {
  tenantId: string;
  periodEnd?: string | null; // 'YYYY-MM-DD'; null/undefined = sin tope
}): Promise<AccountBalance[]> {
  if (!input.tenantId) throw new Error('computeAccountBalances: tenantId required');
  if (input.periodEnd && !ISO_DATE_REGEX.test(input.periodEnd)) {
    throw new Error('computeAccountBalances: periodEnd must be YYYY-MM-DD');
  }
  const applyEnd = !!input.periodEnd;
  const sql = buildAccountBalancesSQL({ applyEnd });

  type Row = {
    account: string;
    balance: string;
    totalDebits: string;
    totalCredits: string;
  };

  const params: unknown[] = [input.tenantId];
  if (applyEnd) params.push(input.periodEnd);

  const rows = await prisma.$queryRawUnsafe<Row[]>(sql, ...params);
  return classifyBalances(rows);
}
