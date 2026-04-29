// Mock ESM-problematic dependencies
jest.mock('@/app/lib/holded-session', () => ({
  getHoldedSession: jest.fn(),
}));
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    customer: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { DELETE, GET, PUT } from './route';

describe('Contactos API (GET/PUT/DELETE)', () => {
  const mockSession = { tenantId: 'tenant-1', userId: 'user-1' };
  beforeEach(() => {
    jest.clearAllMocks();
    (getHoldedSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('requiere autenticación', async () => {
    (getHoldedSession as jest.Mock).mockResolvedValueOnce(null);
    // @ts-expect-error -- mock for testing
    const res = await GET({}, { params: { id: 'c1' } });
    expect(res.status).toBe(401);
  });

  it('devuelve contacto por id', async () => {
    (prisma.customer.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Cliente 1' });
    // @ts-expect-error -- mock for testing
    const res = await GET({}, { params: { id: 'c1' } });
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.id).toBe('c1');
  });

  it('actualiza contacto', async () => {
    (prisma.customer.update as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Actualizado' });
    const req = { json: async () => ({ name: 'Actualizado' }) } as any;
    // @ts-expect-error -- mock for testing
    const res = await PUT(req, { params: { id: 'c1' } });
    const json = await res.json();
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', tenantId: mockSession.tenantId } })
    );
    expect(json.ok).toBe(true);
    expect(json.data.name).toBe('Actualizado');
  });

  it('borra contacto', async () => {
    (prisma.customer.delete as jest.Mock).mockResolvedValue({});
    // @ts-expect-error -- mock for testing
    const res = await DELETE({}, { params: { id: 'c1' } });
    const json = await res.json();
    expect(prisma.customer.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', tenantId: mockSession.tenantId } })
    );
    expect(json.ok).toBe(true);
  });

  it('devuelve error si los datos son inválidos en PUT', async () => {
    const req = { json: async () => ({}) } as any;
    // @ts-expect-error -- mock for testing
    const res = await PUT(req, { params: { id: 'c1' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('Datos inválidos');
  });
});
