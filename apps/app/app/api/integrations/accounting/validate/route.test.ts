/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  getAccountingIntegrationAccess: jest.fn(),
}));

jest.mock('@/lib/integrations/accounting', () => ({
  maskSecret: jest.fn(() => 'demo****key'),
  probeAccountingApiConnection: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { getSessionPayload } from '@/lib/session';
import { resolveHoldedOnboardingSessionFromHeaders } from '@/lib/integrations/holdedOnboardingSession';

describe('POST /api/integrations/accounting/validate', () => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  const dashboardProbe = {
    ok: true,
    provider: 'holded' as const,
    profile: 'dashboard' as const,
    invoiceApi: { ok: true, status: 200 },
    contactsApi: { ok: true, status: 200 },
    accountingApi: { ok: true, status: 200 },
    crmApi: { ok: false, status: 403 },
    projectsApi: { ok: false, status: 403 },
    teamApi: { ok: false, status: 403 },
    requiredCapabilities: ['invoiceApi', 'contactsApi', 'accountingApi'],
    missingCapabilities: [],
    error: null,
  };

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
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'session-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(null);
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.SESSION_SECRET = previousSessionSecret;
  });

  it('validates the api key without persisting the connection', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/validate',
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
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.ok).toBe(true);
    expect(payload.requestId).toEqual(expect.any(String));
    expect(payload.keyMasked).toBe('demo****key');
    expect(typeof payload.validationToken).toBe('string');
    expect(payload.validationToken.length).toBeGreaterThan(20);
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key', {
      profile: 'chatgpt',
    });
  });

  it('normalizes pasted api keys before validating them', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/validate',
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
  });

  it('does not mint a validation token for chatgpt when crm and projects are missing', async () => {
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
      'https://app.verifactu.business/api/integrations/accounting/validate',
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
    expect(payload.validationToken).toBeNull();
    expect(payload.probe.error).toContain('agenda comercial');
  });

  it('accepts the dashboard minimum capability set without crm and projects', async () => {
    (probeAccountingApiConnection as jest.Mock).mockResolvedValue(dashboardProbe);

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/validate',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'dashboard',
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
    expect(payload.ok).toBe(true);
    expect(payload.requestId).toEqual(expect.any(String));
    expect(typeof payload.validationToken).toBe('string');
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key', {
      profile: 'dashboard',
    });
  });

  it('accepts a chatgpt onboarding session without requiring tenant context first', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: null,
      name: 'Connector Guest',
    });

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/validate',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
          'x-holded-onboarding-token': 'onboarding-token-123',
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
    expect(payload.ok).toBe(true);
    expect(typeof payload.validationToken).toBe('string');
    expect(requireTenantContext).not.toHaveBeenCalled();
    expect(getAccountingIntegrationAccess).not.toHaveBeenCalled();
  });
});
