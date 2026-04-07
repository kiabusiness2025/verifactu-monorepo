/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  getAccountingIntegrationAccess: jest.fn(),
}));

jest.mock('@/lib/integrations/accounting', () => ({
  encryptIntegrationSecret: jest.fn(() => 'encrypted-demo-key'),
  maskSecret: jest.fn(() => 'demo****key'),
  probeAccountingApiConnection: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  upsertAccountingIntegration: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/holdedConnectionEmails', () => ({
  sendHoldedConnectionLifecycleEmails: jest.fn(),
  sendWelcomeLifecycleEmails: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  getHoldedOnboardingTokenFromHeaders: jest.fn(() => null),
  isVerifiedHoldedOnboardingIdentity: jest.fn(
    (session: { email?: string | null; emailVerified?: boolean; authMethod?: string | null }) =>
      Boolean(session?.email && (session?.emailVerified || session?.authMethod === 'google'))
  ),
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { mintHoldedValidationToken } from '@/lib/integrations/holdedValidationToken';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import {
  sendHoldedConnectionLifecycleEmails,
  sendWelcomeLifecycleEmails,
} from '@/lib/email/holdedConnectionEmails';
import {
  getHoldedOnboardingTokenFromHeaders,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';

describe('POST /api/integrations/accounting/connect', () => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  const chatgptProbe = {
    ok: true,
    provider: 'holded' as const,
    profile: 'chatgpt' as const,
    invoiceApi: { ok: true, status: 200 },
    contactsApi: { ok: true, status: 200 },
    accountingApi: { ok: true, status: 200 },
    crmApi: { ok: true, status: 200 },
    projectsApi: { ok: true, status: 200 },
    teamApi: { ok: false, status: 403 },
    requiredCapabilities: ['invoiceApi', 'contactsApi', 'accountingApi', 'crmApi', 'projectsApi'],
    missingCapabilities: [],
    error: null,
  };

  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
  });

  beforeEach(() => {
    getHoldedOnboardingTokenFromHeaders.mockReturnValue(null);
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'demo@example.com', name: 'Demo User' },
    });
    (getAccountingIntegrationAccess as jest.Mock).mockResolvedValue({
      canConnect: true,
      connectionMode: 'holded_first',
      planCode: 'empresa',
    });
    (probeAccountingApiConnection as jest.Mock).mockResolvedValue(chatgptProbe);
    (upsertAccountingIntegration as jest.Mock).mockResolvedValue({
      status: 'connected',
      last_sync_at: null,
      last_error: null,
    });
    (
      (prisma as unknown as { tenant: { findUnique: jest.Mock } }).tenant.findUnique as jest.Mock
    ).mockResolvedValue({
      name: 'Empresa Demo SL',
      legalName: 'Empresa Demo SL',
      profile: {
        legalName: 'Empresa Demo SL',
        tradeName: 'Empresa Demo',
        email: 'empresa@example.com',
        phone: '+34 600 000 000',
      },
    });
    (sendHoldedConnectionLifecycleEmails as jest.Mock).mockResolvedValue([]);
    (sendWelcomeLifecycleEmails as jest.Mock).mockResolvedValue([]);
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.SESSION_SECRET = previousSessionSecret;
  });

  it('rejects the connection when legal acceptance is incomplete', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: false,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Debes aceptar los Terminos y la Politica de Privacidad');
    expect(probeAccountingApiConnection).not.toHaveBeenCalled();
    expect(upsertAccountingIntegration).not.toHaveBeenCalled();
  });

  it('connects when terms and privacy are accepted', async () => {
    const holdedOnboardingSession = {
      uid: 'holded-guest-1',
      email: 'demo@example.com',
      name: 'Demo User',
      authMethod: 'google',
      emailVerified: true,
    };
    getHoldedOnboardingTokenFromHeaders.mockReturnValue('onboarding-token-123');
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(
      holdedOnboardingSession
    );

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
          'x-isaak-tenant-id': 'tenant-demo',
        },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.ok).toBe(true);
    expect(payload.requestId).toEqual(expect.any(String));
    expect(requireTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: 'chatgpt',
        tenantIdHint: 'tenant-demo',
      })
    );
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key', {
      profile: 'chatgpt',
    });
    expect(upsertAccountingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        connectedByUserId: 'user-1',
        channelKey: 'chatgpt',
        legalAcceptanceVersion: 'holded_connection_v1',
      })
    );
    expect(sendWelcomeLifecycleEmails).toHaveBeenCalledWith({
      userEmail: 'demo@example.com',
      userName: 'Demo User',
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      contactName: 'Demo User',
      contactEmail: 'demo@example.com',
      companyEmail: 'empresa@example.com',
      contactPhone: '+34 600 000 000',
    });
    expect(sendHoldedConnectionLifecycleEmails).not.toHaveBeenCalled();
  });

  it('blocks connect when onboarding identity is still unverified', async () => {
    getHoldedOnboardingTokenFromHeaders.mockReturnValue('onboarding-token-123');
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'demo@example.com',
      name: 'Demo User',
      authMethod: 'email',
      emailVerified: false,
    });

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.reason).toBe('identity_verification_required');
    expect(requireTenantContext).not.toHaveBeenCalled();
  });

  it('reuses a valid validation token and skips the second Holded probe', async () => {
    const validationToken = await mintHoldedValidationToken({
      tenantId: 'tenant-1',
      channel: 'chatgpt',
      apiKey: 'demo-key',
      probe: chatgptProbe,
    });

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: true,
          validationToken,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.requestId).toEqual(expect.any(String));
    expect(probeAccountingApiConnection).not.toHaveBeenCalled();
    expect(upsertAccountingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        status: 'connected',
      })
    );
  });

  it('stores an error when chatgpt probing lacks the required crm and projects access', async () => {
    (upsertAccountingIntegration as jest.Mock).mockResolvedValue({
      status: 'error',
      last_sync_at: null,
      last_error:
        'La API key de Holded no tiene acceso suficiente para la conexion con ChatGPT. Falta acceso a agenda comercial y proyectos.',
    });
    (probeAccountingApiConnection as jest.Mock).mockResolvedValue({
      ...chatgptProbe,
      ok: false,
      crmApi: { ok: false, status: 403 },
      projectsApi: { ok: false, status: 403 },
      missingCapabilities: ['crmApi', 'projectsApi'],
      error:
        'La API key de Holded no tiene acceso suficiente para la conexion con ChatGPT. Falta acceso a agenda comercial y proyectos.',
    });

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(false);
    expect(payload.lastError).toContain('agenda comercial');
    expect(upsertAccountingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        lastError: expect.stringContaining('agenda comercial'),
      })
    );
  });

  it('normalizes pasted api keys before probing and saving the connection', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: ' demo-\nkey \t 123 ',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key123', {
      profile: 'chatgpt',
    });
    expect(upsertAccountingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyEnc: 'encrypted-demo-key',
      })
    );
  });
});
