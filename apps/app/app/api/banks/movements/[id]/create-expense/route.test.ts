/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    seTransaction: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    expenseRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';

const authMock = requireTenantContext as jest.MockedFunction<typeof requireTenantContext>;
const prismaMock = prisma as unknown as {
  seTransaction: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  expenseRecord: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
};

describe('POST /api/banks/movements/[id]/create-expense', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ tenantId: 'tenant-1' } as any);
  });

  it('returns 404 when movement is missing', async () => {
    prismaMock.seTransaction.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      new NextRequest('http://localhost/api/banks/movements/m1/create-expense', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'm1' }) }
    );

    expect(response.status).toBe(404);
  });

  it('deduplicates by bank reference and reconciles movement', async () => {
    prismaMock.seTransaction.findFirst.mockResolvedValueOnce({
      id: 'm1',
      madeOn: '2026-05-01',
      amount: -100,
      description: 'Servicio',
      category: 'Servicios',
      reconciledAt: null,
    });
    prismaMock.expenseRecord.findFirst.mockResolvedValueOnce({
      id: 'e-existing',
      tenantId: 'tenant-1',
      reference: 'bank:m1',
    });

    const response = await POST(
      new NextRequest('http://localhost/api/banks/movements/m1/create-expense', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'm1' }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, deduplicated: true, expenseId: 'e-existing' });
    expect(prismaMock.seTransaction.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.expenseRecord.create).not.toHaveBeenCalled();
  });

  it('creates expense and reconciles movement for new record', async () => {
    prismaMock.seTransaction.findFirst.mockResolvedValueOnce({
      id: 'm2',
      madeOn: '2026-05-02',
      amount: -200,
      description: 'Proveedor mensual',
      category: 'Servicios',
      reconciledAt: null,
    });
    prismaMock.expenseRecord.findFirst.mockResolvedValueOnce(null);
    prismaMock.expenseRecord.create.mockResolvedValueOnce({
      id: 'e-new',
      tenantId: 'tenant-1',
      amount: 200,
      reference: 'bank:m2',
    });
    prismaMock.seTransaction.update.mockResolvedValueOnce({
      id: 'm2',
      reconciledAt: new Date('2026-05-07T13:00:00.000Z'),
    });

    const response = await POST(
      new NextRequest('http://localhost/api/banks/movements/m2/create-expense', {
        method: 'POST',
        body: JSON.stringify({ description: 'Proveedor mensual', taxRate: 0.21 }),
      }),
      { params: Promise.resolve({ id: 'm2' }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, expenseId: 'e-new', movementId: 'm2' });
    expect(prismaMock.expenseRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reference: 'bank:m2' }),
      })
    );
    expect(prismaMock.seTransaction.update).toHaveBeenCalledTimes(1);
  });
});
