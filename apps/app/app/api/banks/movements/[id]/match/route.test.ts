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
  },
}));

import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';

const authMock = requireTenantContext as jest.MockedFunction<typeof requireTenantContext>;
const prismaMock = prisma as unknown as {
  seTransaction: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

describe('POST /api/banks/movements/[id]/match', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ tenantId: 'tenant-1' } as any);
  });

  it('returns 404 when movement does not exist', async () => {
    prismaMock.seTransaction.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      new Request('http://localhost/api/banks/movements/m1/match', {
        method: 'POST',
        body: JSON.stringify({ reconciled: true }),
      }),
      { params: Promise.resolve({ id: 'm1' }) }
    );

    expect(response.status).toBe(404);
    expect(prismaMock.seTransaction.update).not.toHaveBeenCalled();
  });

  it('marks movement reconciled by default', async () => {
    prismaMock.seTransaction.findFirst.mockResolvedValueOnce({ id: 'm1', reconciledAt: null });
    prismaMock.seTransaction.update.mockResolvedValueOnce({
      id: 'm1',
      reconciledAt: new Date('2026-05-07T12:00:00.000Z'),
      updatedAt: new Date('2026-05-07T12:00:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/banks/movements/m1/match', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'm1' }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, movementId: 'm1', reconciled: true });
    expect(prismaMock.seTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
      })
    );
  });

  it('unmarks movement when reconciled=false', async () => {
    prismaMock.seTransaction.findFirst.mockResolvedValueOnce({
      id: 'm1',
      reconciledAt: new Date('2026-05-06T10:00:00.000Z'),
    });
    prismaMock.seTransaction.update.mockResolvedValueOnce({
      id: 'm1',
      reconciledAt: null,
      updatedAt: new Date('2026-05-07T12:00:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/banks/movements/m1/match', {
        method: 'POST',
        body: JSON.stringify({ reconciled: false }),
      }),
      { params: Promise.resolve({ id: 'm1' }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, reconciled: false });
    expect(prismaMock.seTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reconciledAt: null },
      })
    );
  });
});
