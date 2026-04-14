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

import { getHoldedSession } from '@/app/lib/holded-session';
import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { sendPublicHighGovernanceRiskInternalAlertEmail } from '@/app/lib/communications/holded-governance-emails';
import { recordUsageEvent } from '@verifactu/integrations';
import { mintHoldedValidationToken } from '@/app/lib/holded-validation-token';
import {
  disconnectHoldedConnection,
  getHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

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
      taxId: 'B12345678',
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

  it('uses the requested notification email when session email is missing', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          taxId: 'B12345678',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'ana@example.com',
          contactPhone: '+34 600 111 222',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.notificationEmail).toBe('ana@example.com');
    expect(mockTenantProfileFindFirst).not.toHaveBeenCalled();
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
          nif: 'B12345678',
        }),
      })
    );
    expect(mockSendHoldedConnectedCommunication).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      companyName: 'Acme SL',
      supportedModules: ['invoicing', 'accounting'],
    });
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
      taxId: 'B12345678',
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
          taxId: 'B12345678',
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
      actorEmail: 'ana@example.com',
      companyEmail: 'ana@example.com',
      contactPhone: '+34 600 111 222',
      ownershipStatus: 'third_party_managed',
      managedByThirdParty: true,
      clientAdminGap: true,
      underClaimReview: false,
      detectedAt: expect.any(Date),
    });
  });

  it('rejects an invalid requested notification email before probing Holded', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
          companyName: 'Acme SL',
          taxId: 'B12345678',
          contactFirstName: 'Ana',
          contactLastName: 'Garcia',
          contactEmail: 'not-an-email',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error:
        'Necesitamos un correo valido de contacto para enviarte las comunicaciones del conector.',
      reason: 'manual_company_data_required',
    });
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
    expect(mockSendHoldedConnectedCommunication).not.toHaveBeenCalled();
  });

  it('rejects the connection before probing when required company data is missing', async () => {
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

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: 'Necesitamos el nombre de la empresa para crear correctamente tu espacio.',
      reason: 'manual_company_data_required',
    });
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
    expect(mockSaveHoldedConnection).not.toHaveBeenCalled();
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
          taxId: 'B12345678',
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
});
