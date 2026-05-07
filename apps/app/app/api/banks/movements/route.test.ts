/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    seTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';

const authMock = requireTenantContext as jest.MockedFunction<typeof requireTenantContext>;
const prismaMock = prisma as unknown as {
  seTransaction: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

describe('GET /api/banks/movements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns auth error when tenant context fails', async () => {
    authMock.mockResolvedValueOnce({ error: 'Unauthorized', status: 401 } as any);

    const response = await GET(new NextRequest('http://localhost/api/banks/movements'));
    expect(response.status).toBe(401);
    expect(prismaMock.seTransaction.findMany).not.toHaveBeenCalled();
  });

  it('returns movement list and summary', async () => {
    authMock.mockResolvedValueOnce({ tenantId: 'tenant-1' } as any);
    prismaMock.seTransaction.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        madeOn: '2026-05-01',
        amount: 120,
        currency: 'EUR',
        description: 'Pago proveedor',
        category: 'Servicios',
        payee: 'Proveedor',
        payer: null,
        reconciledAt: null,
        account: {
          id: 'a1',
          name: 'Cuenta Principal',
          iban: 'ES00',
          currency: 'EUR',
        },
      },
    ]);
    prismaMock.seTransaction.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    const response = await GET(
      new NextRequest('http://localhost/api/banks/movements?status=invalid&limit=50')
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      source: 'saltedge',
      status: 'unmatched',
      summary: {
        unmatched: 3,
        reconciled: 2,
        total: 5,
      },
    });
    expect(json.items).toHaveLength(1);
    expect(prismaMock.seTransaction.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.seTransaction.count).toHaveBeenCalledTimes(2);
  });
});
