// Mock ESM-problematic dependencies
jest.mock('@/app/lib/holded-session', () => ({
  getHoldedSession: jest.fn(),
}));
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    supplier: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    expenseRecord: {
      update: jest.fn(),
    },
  },
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { PUT } from './route';

const mockSession = { tenantId: 'tenant-1', userId: 'user-1' };
(getHoldedSession as jest.Mock).mockResolvedValue(mockSession);

const baseSupplier = {
  id: 'supplier-1',
  name: 'Proveedor S.A.',
  nif: 'B12345678',
  email: 'proveedor@sa.com',
  phone: '123456789',
  address: 'Calle Falsa 123',
  city: 'Madrid',
  postalCode: '28000',
  country: 'España',
  paymentTerms: '30 días',
  notes: 'Ninguna',
};

const baseExpense = {
  id: 'expense-1',
  date: new Date('2024-01-01'),
  description: 'Compra de material',
  category: 'material',
  amount: 121,
  taxRate: 0.21,
  taxCategory: 'ninguna',
  canonicalStatus: 'draft',
  status: 'received',
  docType: 'invoice',
  reference: 'INV-001',
  notes: 'Sin observaciones',
  supplier: baseSupplier,
};

describe('PUT /api/holded/purchases/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requiere autenticación', async () => {
    (getHoldedSession as jest.Mock).mockResolvedValueOnce(null);
    const req = { json: jest.fn() } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'expense-1' }) });
    expect(res.status).toBe(401);
  });

  it('valida datos y actualiza compra/gasto y proveedor', async () => {
    (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(baseSupplier);
    (prisma.expenseRecord.update as jest.Mock).mockResolvedValue(baseExpense);
    const req = {
      json: async () => ({
        date: '2024-01-01',
        description: 'Compra de material',
        category: 'material',
        amount: 121,
        iva: 0.21,
        proveedor: { name: 'Proveedor S.A.', nif: 'B12345678' },
        status: 'received',
        canonicalStatus: 'draft',
        docType: 'invoice',
        reference: 'INV-001',
        notes: 'Sin observaciones',
      }),
    } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'expense-1' }) });
    const json = await res.json();
    expect(prisma.supplier.findFirst).toHaveBeenCalled();
    expect(prisma.expenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'expense-1', tenantId: mockSession.tenantId },
        data: expect.objectContaining({
          description: 'Compra de material',
          amount: 121,
        }),
      })
    );
    expect(json.ok).toBe(true);
    expect(json.data.id).toBe('expense-1');
    expect(json.data.proveedor.name).toBe('Proveedor S.A.');
  });

  it('crea proveedor si no existe', async () => {
    (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.supplier.create as jest.Mock).mockResolvedValue(baseSupplier);
    (prisma.expenseRecord.update as jest.Mock).mockResolvedValue(baseExpense);
    const req = {
      json: async () => ({
        date: '2024-01-01',
        description: 'Compra de material',
        category: 'material',
        amount: 121,
        iva: 0.21,
        proveedor: { name: 'Proveedor S.A.', nif: 'B12345678' },
      }),
    } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'expense-1' }) });
    expect(prisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Proveedor S.A.' }),
      })
    );
    expect(prisma.expenseRecord.update).toHaveBeenCalled();
  });

  it('devuelve error si los datos son inválidos', async () => {
    const req = { json: async () => ({ proveedor: {} }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'expense-1' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('Datos inválidos');
  });

  it('devuelve error si el JSON es inválido', async () => {
    const req = {
      json: async () => {
        throw new Error('bad json');
      },
    } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'expense-1' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('JSON inválido');
  });
});
