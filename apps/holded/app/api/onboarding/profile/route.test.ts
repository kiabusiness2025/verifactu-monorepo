/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/holded-integration', () => ({
  __esModule: true,
  getHoldedConnection: jest.fn(),
}));

jest.mock('@verifactu/integrations', () => ({
  __esModule: true,
  saveIsaakOnboardingDraft: jest.fn(),
  completeIsaakOnboarding: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    tenantProfile: {
      upsert: jest.fn(),
    },
  },
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { completeIsaakOnboarding, saveIsaakOnboardingDraft } from '@verifactu/integrations';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockGetHoldedConnection = getHoldedConnection as jest.Mock;
const mockCompleteIsaakOnboarding = completeIsaakOnboarding as jest.Mock;
const mockSaveIsaakOnboardingDraft = saveIsaakOnboardingDraft as jest.Mock;
const mockTenantProfileUpsert = prisma.tenantProfile.upsert as jest.Mock;

describe('POST /api/onboarding/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
    });

    mockGetHoldedConnection.mockResolvedValue({
      keyMasked: 'abcd****mnop',
      status: 'connected',
      supportedModules: ['invoicing'],
      validationSummary: 'ok',
      tenantName: 'Acme SL',
      legalName: 'Acme Sociedad Limitada',
      taxId: 'B12345678',
      connectedAt: '2026-04-16T10:00:00.000Z',
      lastValidatedAt: '2026-04-16T10:05:00.000Z',
    });

    mockCompleteIsaakOnboarding.mockResolvedValue({
      profile: { preferredName: 'Ana' },
      instructions: { greeting: 'hola' },
    });

    mockSaveIsaakOnboardingDraft.mockResolvedValue(undefined);
    mockTenantProfileUpsert.mockResolvedValue({ tenantId: 'tenant_1' });
  });

  it('returns 400 for invalid Spanish phone on complete mode', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/onboarding/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'complete',
          preferredName: 'Ana',
          companyName: 'Acme SL',
          roleInCompany: 'administrador',
          businessSector: 'Servicios',
          phone: '12345',
          mainGoals: ['Entender mi contabilidad'],
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('telefono no parece valido');
    expect(mockCompleteIsaakOnboarding).not.toHaveBeenCalled();
  });

  it('stores CNAE code and company address into tenant profile on complete mode', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/onboarding/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'complete',
          preferredName: 'Ana',
          companyName: 'Acme SL',
          roleInCompany: 'administrador',
          businessSector: 'Servicios profesionales',
          companySectorCode: 'M',
          companyAddress: 'Calle Gran Via 1, Madrid',
          phone: '+34600111222',
          mainGoals: ['Entender mi contabilidad'],
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockCompleteIsaakOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          companySectorCode: 'M',
          companyAddress: 'Calle Gran Via 1, Madrid',
        }),
      })
    );
    expect(mockTenantProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant_1' },
        create: expect.objectContaining({
          cnaeCode: 'M',
          cnaeText: 'Servicios profesionales',
          address: 'Calle Gran Via 1, Madrid',
        }),
        update: expect.objectContaining({
          cnaeCode: 'M',
          cnaeText: 'Servicios profesionales',
          address: 'Calle Gran Via 1, Madrid',
        }),
      })
    );
  });
});
