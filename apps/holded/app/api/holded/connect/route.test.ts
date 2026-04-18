/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedConnectedCommunication: jest.fn(),
}));

jest.mock('@/app/lib/communications/holded-governance-emails', () => ({
  __esModule: true,
  sendPublicHighGovernanceRiskInternalAlertEmail: jest.fn(),
}));

jest.mock('@verifactu/integrations', () => ({
  __esModule: true,
  getConnectorRequestId: jest.fn(() => 'req-connect-1'),
  withConnectorRequestId: jest.fn((response: Response) => response),
  buildConnectorEvent: jest.fn((input: Record<string, unknown>) => input),
  logConnectorEvent: jest.fn(),
  recordUsageEvent: jest.fn(),
  buildConnectionStatusDto: jest.fn((input: Record<string, unknown>) => ({
    connectionId: input.connectionId ?? 'holded-connection',
    tenantId: input.tenantId,
    provider: 'holded',
    status: input.status === 'error' ? 'failed' : input.status,
    keyMasked: input.keyMasked ?? null,
    providerAccountId: input.providerAccountId ?? null,
    connectedAt: input.connectedAt ?? null,
    lastValidatedAt: input.lastValidatedAt ?? null,
    lastSyncAt: input.lastSyncAt ?? null,
    lastError: input.lastError ?? null,
    originChannel: input.originChannel ?? null,
    supportedModules: input.supportedModules ?? [],
  })),
  buildDefaultAvailableActions: jest.fn(() => ({
    reconnect: {
      blocked: false,
      reason: 'ok',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    rotateApi: {
      blocked: false,
      reason: 'ok',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    disconnect: {
      blocked: false,
      reason: 'ok',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    manageMembers: {
      blocked: false,
      reason: 'ok',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    manageRecipients: {
      blocked: false,
      reason: 'ok',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    openClaim: {
      blocked: false,
      reason: 'ok',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
  })),
  buildDetectedCompany: jest.fn((input: Record<string, unknown>) => ({
    companyName: input.companyName ?? null,
    legalName: input.legalName ?? null,
    taxId: input.taxId ?? null,
    source: input.source ?? 'manual',
    confidence: 'high',
    isPartial: false,
    missingFields: [],
  })),
  buildGovernanceFlags: jest.fn((input?: Record<string, unknown> | null) => ({
    ownershipStatus: input?.ownershipStatus ?? null,
    managedByThirdParty: input?.managedByThirdParty === true,
    clientAdminGap: input?.clientAdminGap === true,
    highGovernanceRisk: input?.highGovernanceRisk === true,
    underClaimReview: input?.underClaimReview === true,
  })),
}));

jest.mock('@/app/lib/holded-integration', () => ({
  __esModule: true,
  disconnectHoldedConnection: jest.fn(),
  getHoldedConnection: jest.fn(),
  probeHoldedConnection: jest.fn(),
  saveHoldedConnection: jest.fn(),
}));

jest.mock('@/app/lib/holded-activity', () => ({
  __esModule: true,
  writeHoldedActivity: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    tenantProfile: {
      findFirst: jest.fn(),
    },
  },
}));

import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { sendPublicHighGovernanceRiskInternalAlertEmail } from '@/app/lib/communications/holded-governance-emails';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import {
  disconnectHoldedConnection,
  getHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import { mintHoldedValidationToken } from '@/app/lib/holded-validation-token';
import { prisma } from '@/app/lib/prisma';
import { buildConnectionStatusDto, recordUsageEvent } from '@verifactu/integrations';
import { DELETE, POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockSendHoldedConnectedCommunication = sendHoldedConnectedCommunication as jest.Mock;
const mockRecordUsageEvent = recordUsageEvent as jest.Mock;
const mockProbeHoldedConnection = probeHoldedConnection as jest.Mock;
const mockSaveHoldedConnection = saveHoldedConnection as jest.Mock;
const mockDisconnectHoldedConnection = disconnectHoldedConnection as jest.Mock;
const mockGetHoldedConnection = getHoldedConnection as jest.Mock;
const mockWriteHoldedActivity = writeHoldedActivity as jest.Mock;
const mockTenantFindUnique = prisma.tenant.findUnique as jest.Mock;
const mockTenantUpdate = prisma.tenant.update as jest.Mock;
const mockUserUpdate = prisma.user.update as jest.Mock;
const mockTenantProfileFindFirst = prisma.tenantProfile.findFirst as jest.Mock;
const mockBuildConnectionStatusDto = buildConnectionStatusDto as jest.Mock;
const originalFetch = global.fetch;

describe('POST /api/holded/connect', () => {
  const originalSessionSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_SECRET = 'test-session-secret';

    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: null,
      name: 'Ana',
    });
    mockProbeHoldedConnection.mockResolvedValue({
      ok: true,
      invoiceApi: { ok: true, status: 200 },
      accountingApi: { ok: true, status: 200 },
      crmApi: { ok: false, status: 403 },
      projectsApi: { ok: false, status: 403 },
      teamApi: { ok: false, status: 403 },
    });
    mockSaveHoldedConnection.mockResolvedValue({
      connected: true,
      connectedAt: '2026-04-11T12:00:00.000Z',
      keyMasked: 'abcd****mnop',
      providerAccountId: 'provider-account-1',
      supportedModules: ['invoicing', 'accounting'],
      tenantName: 'Acme SL',
    });
    mockGetHoldedConnection.mockResolvedValue({
      provider: 'holded',
      channel: 'dashboard',
      status: 'connected',
      connectedAt: '2026-04-11T12:00:00.000Z',
      lastValidatedAt: '2026-04-11T12:00:00.000Z',
      lastSyncAt: '2026-04-11T12:00:00.000Z',
      originChannel: 'dashboard',
      providerAccountId: 'provider-account-1',
      keyMasked: 'abcd****mnop',
      supportedModules: ['invoicing', 'accounting'],
      validationSummary: 'ok',
      ownershipStatus: 'pending_confirmation',
      managedByThirdParty: false,
      clientAdminGap: false,
      highGovernanceRisk: false,
      underClaimReview: false,
      technicalOperatorUserId: 'user_1',
      tenantName: 'Acme SL',
      legalName: 'Acme Sociedad Limitada',
      taxId: '12345678Z',
      apiKey: 'abcdefghijklmnop',
    });
    mockRecordUsageEvent.mockResolvedValue(undefined);
    mockSendHoldedConnectedCommunication.mockResolvedValue({
      customerEmailId: 'customer-mail-id',
      adminEmailId: 'admin-mail-id',
    });
    (sendPublicHighGovernanceRiskInternalAlertEmail as jest.Mock).mockResolvedValue(true);
    mockWriteHoldedActivity.mockResolvedValue(undefined);
    mockTenantFindUnique.mockResolvedValue({
      name: 'Ana - Holded',
      legalName: null,
      nif: null,
      profile: null,
    });
    mockTenantUpdate.mockResolvedValue({ id: 'tenant_1' });
    mockUserUpdate.mockResolvedValue({ id: 'user_1' });
    mockTenantProfileFindFirst.mockResolvedValue({ email: 'tenant@example.com' });
  });

  afterAll(() => {
    process.env.SESSION_SECRET = originalSessionSecret;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses the stored company email as security recipient when available', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
          contactPhone: '+34 600 111 222',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.notificationEmail).toBe('tenant@example.com');
    expect(mockTenantProfileFindFirst).toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: expect.objectContaining({
          name: 'Ana Garcia',
          firstName: 'Ana',
          lastName: 'Garcia',
          phone: '+34 600 111 222',
        }),
      })
    );
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant_1' },
        data: expect.objectContaining({
          name: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          nif: '12345678Z',
        }),
      })
    );
    expect(mockSendHoldedConnectedCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ana',
        userEmail: 'tenant@example.com',
        companyEmail: 'ana@example.com',
        companyName: 'Acme SL',
        supportedModules: ['invoicing', 'accounting'],
      })
    );
    expect(sendPublicHighGovernanceRiskInternalAlertEmail).not.toHaveBeenCalled();
  });

  it('sends an internal governance alert when the resolved public connection is high risk', async () => {
    mockGetHoldedConnection.mockResolvedValue({
      provider: 'holded',
      channel: 'dashboard',
      status: 'connected',
      connectedAt: '2026-04-11T12:00:00.000Z',
      lastValidatedAt: '2026-04-11T12:00:00.000Z',
      lastSyncAt: '2026-04-11T12:00:00.000Z',
      originChannel: 'dashboard',
      providerAccountId: 'provider-account-1',
      keyMasked: 'abcd****mnop',
      supportedModules: ['invoicing', 'accounting'],
      validationSummary: 'ok',
      ownershipStatus: 'third_party_managed',
      managedByThirdParty: true,
      clientAdminGap: true,
      highGovernanceRisk: true,
      underClaimReview: false,
      technicalOperatorUserId: 'user_1',
      tenantName: 'Acme SL',
      legalName: 'Acme Sociedad Limitada',
      taxId: '12345678Z',
      apiKey: 'abcdefghijklmnop',
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
          contactPhone: '+34 600 111 222',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(sendPublicHighGovernanceRiskInternalAlertEmail).toHaveBeenCalledWith({
      tenantName: 'Acme SL',
      tenantLegalName: 'Acme Sociedad Limitada',
      channel: 'dashboard',
      actorName: 'Ana Garcia',
      actorEmail: 'tenant@example.com',
      companyEmail: 'tenant@example.com',
      contactPhone: '+34 600 111 222',
      ownershipStatus: 'third_party_managed',
      managedByThirdParty: true,
      clientAdminGap: true,
      underClaimReview: false,
      detectedAt: expect.any(Date),
    });
  });

  it('does not block connection when requested notification email is invalid', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'not-an-email',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockProbeHoldedConnection).toHaveBeenCalled();
    expect(mockSendHoldedConnectedCommunication).toHaveBeenCalled();
  });

  it('allows connection even when company profile fields are missing initially', async () => {
    mockTenantFindUnique.mockResolvedValueOnce({
      name: null,
      legalName: null,
      nif: null,
      profile: null,
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockProbeHoldedConnection).toHaveBeenCalled();
    expect(mockSaveHoldedConnection).toHaveBeenCalled();
  });

  it('does not fail public onboarding when identity persistence fails after connecting', async () => {
    mockTenantUpdate.mockRejectedValueOnce(new Error('tenant update failed'));

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockSaveHoldedConnection).toHaveBeenCalled();
  });

  it('returns 409 with clear conflict reason when persistence hits duplicate constraint', async () => {
    mockSaveHoldedConnection.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed on the fields'), { code: 'P2002' })
    );

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('duplicate_connection_conflict');
    expect(payload.error).toContain('ya aparece conectada');
  });

  it('returns 503 with explicit reason when integration secret is missing during save', async () => {
    mockSaveHoldedConnection.mockRejectedValueOnce(
      new Error('INTEGRATIONS_SECRET_KEY or SESSION_SECRET is required')
    );

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('integration_secret_missing');
    expect(payload.error).toContain('configuracion temporal');
  });

  it('returns 503 with explicit reason when integration storage schema is pending update', async () => {
    mockSaveHoldedConnection.mockRejectedValueOnce(
      Object.assign(
        new Error('The column `provider_account_id` does not exist in current database'),
        {
          code: 'P2022',
        }
      )
    );

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('integration_storage_update_pending');
    expect(payload.error).toContain('actualizacion interna');
  });

  it('returns 503 when integration storage is temporarily inaccessible by permissions', async () => {
    mockSaveHoldedConnection.mockRejectedValueOnce(
      Object.assign(new Error('permission denied for table external_connections'), {
        code: 'P1010',
      })
    );

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('integration_storage_update_pending');
    expect(payload.error).toContain('actualizacion interna');
  });

  it('does not fail when post-connect shaping throws after saving a valid key', async () => {
    let calls = 0;
    mockBuildConnectionStatusDto.mockImplementation((input: Record<string, unknown>) => {
      calls += 1;
      if (calls === 2) {
        throw new Error('dto failed');
      }

      return {
        connectionId: input.connectionId ?? 'holded-connection',
        tenantId: input.tenantId,
        provider: 'holded',
        status: input.status === 'error' ? 'failed' : input.status,
        keyMasked: input.keyMasked ?? null,
        providerAccountId: input.providerAccountId ?? null,
        connectedAt: input.connectedAt ?? null,
        lastValidatedAt: input.lastValidatedAt ?? null,
        lastSyncAt: input.lastSyncAt ?? null,
        lastError: input.lastError ?? null,
        originChannel: input.originChannel ?? null,
        supportedModules: input.supportedModules ?? [],
      };
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.error).toBeNull();
    expect(mockSaveHoldedConnection).toHaveBeenCalled();
  });

  it('reuses a signed validation token instead of probing Holded again', async () => {
    const validationToken = await mintHoldedValidationToken({
      tenantId: 'tenant_1',
      channel: 'dashboard',
      apiKey: 'abcdefghijklmnop',
      probe: {
        ok: true,
        invoiceApi: { ok: true, status: 200 },
        accountingApi: { ok: true, status: 200 },
        crmApi: { ok: false, status: 403 },
        projectsApi: { ok: false, status: 403 },
        teamApi: { ok: false, status: 403 },
        error: null,
      },
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          validationToken,
          companyName: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
    expect(mockSaveHoldedConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        probe: expect.objectContaining({ ok: true }),
      })
    );
    expect(payload.connection).toMatchObject({
      provider: 'holded',
      status: 'connected',
      providerAccountId: 'provider-account-1',
    });
  });

  it('returns 400 when tax id is not a valid Spanish NIF/CIF', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          taxId: 'A123',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('invalid_tax_id');
    expect(payload.error).toContain('NIF/CIF');
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
  });

  it('allows chatgpt channel when tax id is omitted', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'chatgpt',
          nextTarget: 'https://chatgpt.com/connector/oauth/demo',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockProbeHoldedConnection).toHaveBeenCalled();
    expect(payload.notificationEmail).toBe('tenant@example.com');
    expect(payload.companyEmailVerificationPending).toBe(false);
    expect(mockSendHoldedConnectedCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: 'tenant@example.com',
        companyName: 'Acme SL',
        channel: 'chatgpt',
        returnUrl: 'https://chatgpt.com/connector/oauth/demo',
      })
    );
    expect(mockRecordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HOLDED_CONNECTED',
        source: 'holded_connect_public_chatgpt',
      })
    );
    expect(mockTenantUpdate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when contact phone is not valid for Spain', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
          contactPhone: '12345',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe('invalid_contact_phone');
    expect(payload.error).toContain('formato valido de Espana');
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
  });

  it('does not fail connect when company email verification token cannot be generated', async () => {
    process.env.SESSION_SECRET = '';
    delete process.env.HOLDED_COMPANY_EMAIL_VERIFY_SECRET;

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          taxId: '12345678Z',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockSendHoldedConnectedCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        companyEmailVerificationUrl: null,
      })
    );
  });

  it('delegates disconnect to canonical app endpoint when available', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, status: 'disconnected' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const response = await DELETE(
      new Request('https://holded.verifactu.business/api/holded/connect?channel=chatgpt', {
        method: 'DELETE',
        headers: { cookie: 'session=abc123' },
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.connection).toMatchObject({
      disconnected: true,
      channel: 'chatgpt',
    });
    expect(payload.canonicalDisconnect).toMatchObject({ ok: true, status: 'disconnected' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.verifactu.business/api/integrations/accounting/disconnect',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-isaak-entry-channel': 'chatgpt',
          cookie: 'session=abc123',
        }),
      })
    );
    expect(mockDisconnectHoldedConnection).not.toHaveBeenCalled();
  });

  it('falls back to local disconnect when canonical endpoint is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as typeof fetch;
    mockDisconnectHoldedConnection.mockResolvedValue({
      disconnected: true,
      channel: 'dashboard',
      disconnectedAt: '2026-04-18T00:00:00.000Z',
    });

    const response = await DELETE(
      new Request('https://holded.verifactu.business/api/holded/connect?channel=dashboard', {
        method: 'DELETE',
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.connection).toMatchObject({
      disconnected: true,
      channel: 'dashboard',
      disconnectedAt: '2026-04-18T00:00:00.000Z',
    });
    expect(mockDisconnectHoldedConnection).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      userId: 'user_1',
      channel: 'dashboard',
    });
  });
});
