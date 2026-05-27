// SEC R4 segunda pasada — regression test del lock optimista.
//
// El primer "fix" del lock era cosmético (data: { updatedAt } no cambia
// el resultado del WHERE). Estos tests verifican el patrón final con
// mocks de Prisma para evitar regresiones.

import { MockBrowserAdapter } from '../adapters/mock';

// jest.mock se hoist al inicio del archivo, por eso el factory debe
// crear las funciones jest.fn DENTRO. Después accedemos al mock vía
// require() en cada test.
jest.mock('../../prisma', () => ({
  prisma: {
    isaakAeatSubmission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    tenantCertificate: {
      findFirst: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

import { processPendingSubmissions } from '../submission-worker';
import { prisma as mockPrismaImport } from '../../prisma';
const mockPrisma = mockPrismaImport as unknown as {
  isaakAeatSubmission: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  tenantCertificate: { findFirst: jest.Mock };
  tenant: { findUnique: jest.Mock };
};

beforeEach(() => {
  mockPrisma.isaakAeatSubmission.findMany.mockReset();
  mockPrisma.isaakAeatSubmission.findUnique.mockReset();
  mockPrisma.isaakAeatSubmission.updateMany.mockReset();
  mockPrisma.isaakAeatSubmission.update.mockReset();
  mockPrisma.tenantCertificate.findFirst.mockReset();
  mockPrisma.tenant.findUnique.mockReset();
});

describe('processPendingSubmissions — lock optimista (R4)', () => {
  it('llama updateMany con WHERE pending_aeat + data submitting (lock real)', async () => {
    // No submissions pendientes → no procesa, pero el sweep stale sí corre
    mockPrisma.isaakAeatSubmission.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.isaakAeatSubmission.findMany.mockResolvedValue([]);

    await processPendingSubmissions({
      adapterFactory: () => new MockBrowserAdapter(),
      environment: 'pre',
    });

    // Primera llamada: sweep de stale (no cambia status si nada está stale)
    expect(mockPrisma.isaakAeatSubmission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'submitting' }),
        data: { status: 'pending_aeat' },
      }),
    );
  });

  it('sweep de stale usa threshold de 30 min (R4 audit tercera pasada)', async () => {
    mockPrisma.isaakAeatSubmission.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.isaakAeatSubmission.findMany.mockResolvedValue([]);

    const before = Date.now();
    await processPendingSubmissions({
      adapterFactory: () => new MockBrowserAdapter(),
      environment: 'pre',
    });
    const after = Date.now();

    const sweepCall = mockPrisma.isaakAeatSubmission.updateMany.mock.calls.find(
      (c) => c[0]?.data?.status === 'pending_aeat',
    );
    expect(sweepCall).toBeDefined();
    const cutoff = sweepCall![0].where.updatedAt.lt as Date;
    const elapsedMs = before - cutoff.getTime();
    // 30 min = 1_800_000 ms (±200ms de margen para el tiempo del test)
    expect(elapsedMs).toBeGreaterThanOrEqual(30 * 60 * 1000 - 200);
    expect(elapsedMs).toBeLessThanOrEqual(after - cutoff.getTime() + 200);
  });

  it('skipea la submission si el lock falla (otro worker ya la cogió)', async () => {
    const fakeSub = {
      id: 's1',
      tenantId: 't1',
      status: 'pending_aeat',
      model: '303',
      period: 'Q1-2026',
      submittedAt: new Date(),
    };
    // Stale sweep: count=0 (nada stale)
    // Lock attempt: count=0 (otro worker ganó)
    mockPrisma.isaakAeatSubmission.updateMany
      .mockResolvedValueOnce({ count: 0 }) // stale sweep
      .mockResolvedValueOnce({ count: 0 }); // lock attempt
    mockPrisma.isaakAeatSubmission.findMany.mockResolvedValue([fakeSub]);

    const result = await processPendingSubmissions({
      adapterFactory: () => new MockBrowserAdapter(),
      environment: 'pre',
    });

    // processed se incrementó pero NO procesó la submission
    expect(result.processed).toBe(1);
    expect(result.details).toHaveLength(0);
    // No se invocó findUnique (procesamiento real) ni se cargó cert
    expect(mockPrisma.tenantCertificate.findFirst).not.toHaveBeenCalled();
  });

  it('procesa cuando el lock gana (count=1)', async () => {
    const fakeSub = {
      id: 's1',
      tenantId: 't1',
      status: 'pending_aeat',
      model: '303',
      period: 'Q1-2026',
      submittedAt: new Date(),
    };
    mockPrisma.isaakAeatSubmission.updateMany
      .mockResolvedValueOnce({ count: 0 }) // stale sweep
      .mockResolvedValueOnce({ count: 1 }); // lock gana
    mockPrisma.isaakAeatSubmission.findMany.mockResolvedValue([fakeSub]);
    // Cert no existe → markError → no llega a serializer
    mockPrisma.tenantCertificate.findFirst.mockResolvedValue(null);
    mockPrisma.isaakAeatSubmission.update.mockResolvedValue({});

    const result = await processPendingSubmissions({
      adapterFactory: () => new MockBrowserAdapter(),
      environment: 'pre',
    });

    expect(result.processed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.details[0]?.finalStatus).toBe('error');
    // markError llamó update con status='error'
    expect(mockPrisma.isaakAeatSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'error' }),
      }),
    );
  });

  it('el lock usa exactamente WHERE status=pending_aeat → data status=submitting', async () => {
    const fakeSub = {
      id: 's-lock-test',
      tenantId: 't1',
      status: 'pending_aeat',
      model: '303',
      period: 'Q1-2026',
      submittedAt: new Date(),
    };
    mockPrisma.isaakAeatSubmission.updateMany
      .mockResolvedValueOnce({ count: 0 }) // stale sweep
      .mockResolvedValueOnce({ count: 0 }); // lock attempt (no importa el resultado)
    mockPrisma.isaakAeatSubmission.findMany.mockResolvedValue([fakeSub]);

    await processPendingSubmissions({
      adapterFactory: () => new MockBrowserAdapter(),
      environment: 'pre',
    });

    // Segunda llamada a updateMany es el lock attempt
    const lockCall = mockPrisma.isaakAeatSubmission.updateMany.mock.calls[1];
    expect(lockCall).toBeDefined();
    expect(lockCall![0].where).toMatchObject({
      id: 's-lock-test',
      status: 'pending_aeat',
    });
    expect(lockCall![0].data).toMatchObject({
      status: 'submitting',
    });
  });
});
