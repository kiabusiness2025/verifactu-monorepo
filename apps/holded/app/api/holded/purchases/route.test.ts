// Mock ESM-problematic dependencies
jest.mock('@/app/lib/holded-session', () => ({
  getHoldedSession: jest.fn(),
}));
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    expenseRecord: {
      findMany: jest.fn(),
    },
  },
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { GET } from './route';

describe('Compras / gastos / purchase documents API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('requiere autenticación', async () => {
      (getHoldedSession as jest.Mock).mockResolvedValue(null);
      // @ts-expect-error -- mock for testing
      const req = { method: 'GET' };
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('devuelve lista de compras/gastos con todos los campos', async () => {
      (getHoldedSession as jest.Mock).mockResolvedValue({ tenantId: 'tenant1' });
      (prisma.expenseRecord.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'exp1',
          date: new Date('2024-01-01'),
          description: 'Compra demo',
          category: 'material',
          amount: 121,
          taxRate: 0.21,
          taxCategory: 'ninguna',
          canonicalStatus: 'draft',
          status: 'received',
          docType: 'invoice',
          reference: 'A-123',
          notes: 'Observaciones',
          supplier: {
            id: 'sup1',
            name: 'Proveedor Demo',
            nif: 'B12345678',
            email: 'proveedor@demo.com',
            phone: '600123123',
            address: 'Calle Falsa 123',
            city: 'Madrid',
            postalCode: '28080',
            country: 'ES',
            paymentTerms: '30d',
            notes: 'Proveedor preferente',
          },
        },
      ]);
      // @ts-expect-error -- mock for testing
      const req = { method: 'GET' };
      const res = await GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data[0]).toMatchObject({
        id: 'exp1',
        description: 'Compra demo',
        iva: 0.21,
        subtotal: expect.any(Number),
        total: 121,
        proveedor: expect.objectContaining({ name: 'Proveedor Demo' }),
        concepto: 'Compra demo',
      });
    });
  });

  describe('POST', () => {
    it('requiere autenticación', async () => {
      (getHoldedSession as jest.Mock).mockResolvedValue(null);
      // @ts-expect-error -- mock for testing
      const req = { method: 'POST', json: async () => ({}) };
      const { POST } = await import('./route');
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('valida datos y crea compra/gasto y proveedor', async () => {
      (getHoldedSession as jest.Mock).mockResolvedValue({ tenantId: 'tenant1' });
      prisma.supplier = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sup1', name: 'Proveedor Demo' }),
      };
      prisma.expenseRecord = {
        create: jest.fn().mockResolvedValue({
          id: 'exp1',
          date: new Date('2024-01-01'),
          description: 'Compra demo',
          category: 'material',
          amount: 121,
          taxRate: 0.21,
          taxCategory: 'ninguna',
          canonicalStatus: 'draft',
          status: 'received',
          docType: 'invoice',
          reference: 'A-123',
          notes: 'Observaciones',
          supplier: {
            id: 'sup1',
            name: 'Proveedor Demo',
            nif: 'B12345678',
            email: 'proveedor@demo.com',
            phone: '600123123',
            address: 'Calle Falsa 123',
            city: 'Madrid',
            postalCode: '28080',
            country: 'ES',
            paymentTerms: '30d',
            notes: 'Proveedor preferente',
          },
        }),
      };
      const { POST } = await import('./route');
      // @ts-expect-error -- mock for testing
      const req = {
        method: 'POST',
        json: async () => ({
          date: '2024-01-01',
          description: 'Compra demo',
          amount: 121,
          proveedor: { name: 'Proveedor Demo' },
        }),
      };
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toMatchObject({
        id: 'exp1',
        proveedor: expect.objectContaining({ name: 'Proveedor Demo' }),
      });
      expect(prisma.supplier.create).toHaveBeenCalled();
      expect(prisma.expenseRecord.create).toHaveBeenCalled();
    });

    it('devuelve error si los datos son inválidos', async () => {
      (getHoldedSession as jest.Mock).mockResolvedValue({ tenantId: 'tenant1' });
      const { POST } = await import('./route');
      // @ts-expect-error -- mock for testing
      const req = { method: 'POST', json: async () => ({}) };
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error).toBe('Datos inválidos');
    });
  });
});
