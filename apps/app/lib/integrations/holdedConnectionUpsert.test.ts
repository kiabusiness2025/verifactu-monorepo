/** @jest-environment node */

jest.mock('@/lib/integrations/accounting', () => ({
  encryptIntegrationSecret: jest.fn(() => 'enc-key-stub'),
  probeAccountingApiConnection: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  upsertAccountingIntegration: jest.fn(),
}));

jest.mock('@/lib/email/holdedConnectionEmails', () => ({
  sendHoldedConnectionLifecycleEmails: jest.fn(async () => []),
}));

const userFindUnique = jest.fn();
const userCreate = jest.fn();
const userUpdate = jest.fn();
const tenantFindFirst = jest.fn();
const tenantFindUnique = jest.fn();
const tenantCreate = jest.fn();
const membershipFindMany = jest.fn();
const membershipFindFirst = jest.fn();
const membershipCreate = jest.fn();
const membershipUpdate = jest.fn();
const tenantProfileFindUnique = jest.fn();
const tenantProfileUpsert = jest.fn();
const userPreferenceUpsert = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      create: (...args: unknown[]) => userCreate(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
    tenant: {
      findFirst: (...args: unknown[]) => tenantFindFirst(...args),
      findUnique: (...args: unknown[]) => tenantFindUnique(...args),
      create: (...args: unknown[]) => tenantCreate(...args),
    },
    membership: {
      findMany: (...args: unknown[]) => membershipFindMany(...args),
      findFirst: (...args: unknown[]) => membershipFindFirst(...args),
      create: (...args: unknown[]) => membershipCreate(...args),
      update: (...args: unknown[]) => membershipUpdate(...args),
    },
    tenantProfile: {
      findUnique: (...args: unknown[]) => tenantProfileFindUnique(...args),
      upsert: (...args: unknown[]) => tenantProfileUpsert(...args),
    },
    userPreference: {
      upsert: (...args: unknown[]) => userPreferenceUpsert(...args),
    },
  },
  default: {},
}));

import { upsertHoldedConnectionFromApiKey } from './holdedConnectionUpsert';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';

const probeMock = probeAccountingApiConnection as jest.MockedFunction<
  typeof probeAccountingApiConnection
>;
const upsertConnectionMock = upsertAccountingIntegration as jest.MockedFunction<
  typeof upsertAccountingIntegration
>;
const sendLifecycleEmailsMock = sendHoldedConnectionLifecycleEmails as jest.MockedFunction<
  typeof sendHoldedConnectionLifecycleEmails
>;

const okProbe = {
  ok: true,
  provider: 'holded' as const,
  profile: 'chatgpt' as const,
  invoiceApi: { ok: true, status: 200 },
  contactsApi: { ok: true, status: 200 },
  accountingApi: { ok: true, status: 200 },
  crmApi: { ok: true, status: 200 },
  projectsApi: { ok: true, status: 200 },
  teamApi: { ok: true, status: 200 },
  requiredCapabilities: ['invoiceApi', 'contactsApi', 'accountingApi', 'crmApi', 'projectsApi'],
  missingCapabilities: [],
  error: null,
} as const;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.HOLDED_CONNECTION_LEGAL_VERSION = 'holded_connection_test';
  userFindUnique.mockResolvedValue(null);
  userCreate.mockResolvedValue({ id: 'user-new' });
  tenantFindFirst.mockResolvedValue(null);
  tenantFindUnique.mockResolvedValue({
    name: 'Acme SL',
    legalName: 'Acme SL',
    profile: { legalName: 'Acme SL', tradeName: 'Acme', email: 'admin@acme.es', phone: null },
  });
  tenantCreate.mockResolvedValue({ id: 'tenant-new' });
  membershipFindMany.mockResolvedValue([]);
  membershipFindFirst.mockResolvedValue(null);
  membershipCreate.mockResolvedValue({ id: 'membership-new' });
  tenantProfileFindUnique.mockResolvedValue(null);
  tenantProfileUpsert.mockResolvedValue({ tenantId: 'tenant-new' });
  userPreferenceUpsert.mockResolvedValue({ userId: 'user-new' });
  probeMock.mockResolvedValue(okProbe as never);
  upsertConnectionMock.mockResolvedValue({
    id: 'connection-new',
    tenant_id: 'tenant-new',
    provider: 'accounting_api',
    status: 'connected',
    last_sync_at: null,
    last_error: null,
    created_at: '2026-05-06',
    updated_at: '2026-05-06',
  });
  sendLifecycleEmailsMock.mockResolvedValue([] as never);
});

describe('upsertHoldedConnectionFromApiKey', () => {
  it('rechaza email personal vacío o mal formado', async () => {
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'not-an-email',
      holdedApiKey: 'key-1234567890',
      channel: 'mobile',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('input');
      expect(result.reason).toBe('invalid_personal_email');
    }
  });

  it('rechaza apiKey vacía', async () => {
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: '   ',
      channel: 'mobile',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing_api_key');
  });

  it('rechaza si T&C o privacidad no aceptados', async () => {
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'mobile',
      acceptedTerms: false,
      acceptedPrivacy: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('legal_acceptance_required');
  });

  it('crea User+Tenant+Membership+Connection en happy path', async () => {
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'Demo@Example.COM',
      personalName: 'Demo User',
      holdedApiKey: 'apikey-abcdefghij',
      channel: 'mobile',
      acceptedTerms: true,
      acceptedPrivacy: true,
      companyName: 'Acme',
      companyLegalName: 'Acme SL',
      companyTaxId: 'B12345678',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBe('user-new');
    expect(result.tenantId).toBe('tenant-new');
    expect(result.connectionId).toBe('connection-new');
    expect(result.created).toEqual({ user: true, tenant: true, membership: true });
    expect(probeMock).toHaveBeenCalledWith('apikey-abcdefghij', { profile: 'chatgpt' });
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'demo@example.com',
          authProvider: 'HOLDED_DIRECT',
        }),
      })
    );
    expect(tenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nif: 'B12345678', isDemo: false }),
      })
    );
    expect(membershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'owner',
          side: 'client',
          status: 'active',
        }),
      })
    );
    expect(upsertConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-new',
        channelKey: 'mobile',
        legalAcceptanceVersion: 'holded_connection_v1',
        connectedByUserId: 'user-new',
      })
    );
    expect(sendLifecycleEmailsMock).toHaveBeenCalledTimes(1);
  });

  it('reutiliza tenant existente cuando el user ya tiene membership activa', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-existing',
      name: 'Existing',
      firstName: 'Existing',
      lastName: null,
      authProvider: 'HOLDED_DIRECT',
    });
    membershipFindMany.mockResolvedValue([
      {
        tenantId: 'tenant-existing',
        createdAt: new Date('2026-01-01'),
        tenant: { id: 'tenant-existing', name: 'Empresa', nif: 'B99999999' },
      },
    ]);
    membershipFindFirst.mockResolvedValue({
      id: 'membership-existing',
      status: 'active',
      role: 'owner',
      side: 'client',
    });
    tenantFindUnique.mockResolvedValue({
      name: 'Empresa',
      legalName: 'Empresa SL',
      profile: { legalName: 'Empresa SL', tradeName: 'Empresa', email: null, phone: null },
    });

    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'demo@example.com',
      holdedApiKey: 'apikey-xx',
      channel: 'claude',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenantId).toBe('tenant-existing');
    expect(result.created).toEqual({ user: false, tenant: false, membership: false });
    expect(tenantCreate).not.toHaveBeenCalled();
    expect(membershipCreate).not.toHaveBeenCalled();
    expect(probeMock).toHaveBeenCalledWith('apikey-xx', { profile: 'dashboard' });
  });

  it('retorna stage=probe cuando probeAccountingApiConnection lanza', async () => {
    probeMock.mockRejectedValueOnce(new Error('boom'));
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'mobile',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('probe');
      expect(result.detail).toContain('boom');
    }
    expect(upsertConnectionMock).not.toHaveBeenCalled();
  });

  it('rechaza con stage=probe / reason=invalid_api_key cuando el probe devuelve ok=false', async () => {
    probeMock.mockResolvedValueOnce({
      ...okProbe,
      ok: false,
      error: 'API key sin permisos',
    } as never);

    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'chatgpt',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.stage).toBe('probe');
    expect(result.reason).toBe('invalid_api_key');
    expect(result.detail).toContain('API key sin permisos');
    // No se debe haber tocado la BD ni los emails para no crear ruido
    expect(userCreate).not.toHaveBeenCalled();
    expect(tenantCreate).not.toHaveBeenCalled();
    expect(upsertConnectionMock).not.toHaveBeenCalled();
    expect(sendLifecycleEmailsMock).not.toHaveBeenCalled();
  });

  it('respeta validatedProbe si se proporciona y no llama a la red', async () => {
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'dashboard',
      acceptedTerms: true,
      acceptedPrivacy: true,
      validatedProbe: okProbe as never,
    });
    expect(result.ok).toBe(true);
    expect(probeMock).not.toHaveBeenCalled();
  });

  it('respeta skipNotifications', async () => {
    const result = await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'mobile',
      acceptedTerms: true,
      acceptedPrivacy: true,
      skipNotifications: true,
    });
    expect(result.ok).toBe(true);
    expect(sendLifecycleEmailsMock).not.toHaveBeenCalled();
  });

  it('escoge profile chatgpt para canal mobile y dashboard para canal claude', async () => {
    await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'mobile',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    expect(probeMock).toHaveBeenLastCalledWith('k1234567890', { profile: 'chatgpt' });

    probeMock.mockClear();
    await upsertHoldedConnectionFromApiKey({
      personalEmail: 'a@b.com',
      holdedApiKey: 'k1234567890',
      channel: 'claude',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    expect(probeMock).toHaveBeenLastCalledWith('k1234567890', { profile: 'dashboard' });
  });
});
