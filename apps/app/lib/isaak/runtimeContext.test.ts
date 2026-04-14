/** @jest-environment node */

export {};

const mockFindUserPreference = jest.fn();
const mockFindConversations = jest.fn();
const mockFindMessages = jest.fn();
const mockResolveSharedHoldedConnectionStatusForTenant = jest.fn();
const mockNormalizeIsaakContext = jest.fn((value?: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : 'general'
);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userPreference: {
      findUnique: (...args: unknown[]) => mockFindUserPreference(...args),
    },
    isaakConversation: {
      findMany: (...args: unknown[]) => mockFindConversations(...args),
    },
    isaakConversationMsg: {
      findMany: (...args: unknown[]) => mockFindMessages(...args),
    },
  },
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionStatusForTenant: (...args: unknown[]) =>
    mockResolveSharedHoldedConnectionStatusForTenant(...args),
}));

jest.mock('@/lib/isaak/persona', () => ({
  normalizeIsaakContext: (...args: unknown[]) => mockNormalizeIsaakContext(...args),
}));

import { buildIsaakRuntimeContext } from './runtimeContext';

describe('buildIsaakRuntimeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFindUserPreference.mockResolvedValue({
      preferredTenant: { name: 'Acme Demo' },
    });
    mockFindConversations.mockResolvedValue([
      {
        title: 'Revision impuestos',
        summary: 'Pendiente revisar Q1',
        context: 'fiscal',
        messageCount: 4,
      },
    ]);
    mockFindMessages.mockResolvedValue([
      {
        role: 'user',
        content: 'Necesito el resumen de Holded del ultimo sync',
      },
    ]);
    mockResolveSharedHoldedConnectionStatusForTenant.mockResolvedValue({
      status: 'connected',
      lastSyncAt: '2026-04-05T10:00:00.000Z',
      lastError: 'timeout puntual',
    });
  });

  it('builds runtime context from the shared Holded connection state', async () => {
    const result = await buildIsaakRuntimeContext({
      tenantId: 'tenant-1',
      userId: 'user-1',
      context: 'dashboard',
      conversationId: 'conv-active',
    });

    expect(mockResolveSharedHoldedConnectionStatusForTenant).toHaveBeenCalledWith(
      'tenant-1',
      'dashboard'
    );
    expect(result.systemBlock).toContain('estado Holded: conectado');
    expect(result.systemBlock).toContain('ultimo sync: 2026-04-05T10:00:00.000Z');
    expect(result.systemBlock).toContain('ultimo error registrado: timeout puntual');
    expect(result.systemBlock).toContain(
      'Memoria conversacional reciente del usuario (dashboard):'
    );
  });

  it('returns an empty block when tenant or user are missing', async () => {
    await expect(buildIsaakRuntimeContext({ tenantId: 'tenant-1' })).resolves.toEqual({
      systemBlock: '',
    });

    expect(mockFindUserPreference).not.toHaveBeenCalled();
    expect(mockResolveSharedHoldedConnectionStatusForTenant).not.toHaveBeenCalled();
  });
});
