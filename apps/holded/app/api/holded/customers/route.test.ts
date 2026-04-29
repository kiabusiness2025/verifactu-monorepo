// Mock ESM-problematic dependencies
jest.mock('@/app/lib/holded-session', () => ({
  getHoldedSession: jest.fn(),
}));
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { GET, POST } from './route';

describe('Contactos API (GET/POST)', () => {
  const mockSession = { tenantId: 'tenant-1', userId: 'user-1' };
  beforeEach(() => {
    jest.clearAllMocks();
    (getHoldedSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('requiere autenticación', async () => {
    (getHoldedSession as jest.Mock).mockResolvedValueOnce(null);
    // @ts-expect-error -- mock for testing
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('devuelve lista de contactos', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'c1',
        name: 'Cliente 1',
        email: 'c1@mail.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    // @ts-expect-error -- mock for testing
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data[0].name).toBe('Cliente 1');
  });

  it('valida y crea contacto', async () => {
    (prisma.customer.create as jest.Mock).mockResolvedValue({
      id: 'c2',
      name: 'Nuevo',
      isActive: true,
    });
    const req = { json: async () => ({ name: 'Nuevo', email: 'nuevo@mail.com' }) } as any;
    const res = await POST(req);
    const json = await res.json();
    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Nuevo' }) })
    );
    expect(json.ok).toBe(true);
    expect(json.data.id).toBe('c2');
  });

  it('devuelve error si los datos son inválidos', async () => {
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('Datos inválidos');
  });
});
