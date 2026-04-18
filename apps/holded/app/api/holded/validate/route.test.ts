/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/holded-integration', () => ({
  __esModule: true,
  probeHoldedConnection: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@verifactu/integrations', () => ({
  __esModule: true,
  getConnectorRequestId: jest.fn(() => 'req-validate-1'),
  withConnectorRequestId: jest.fn((response: Response) => response),
  buildConnectorEvent: jest.fn((input: Record<string, unknown>) => input),
  logConnectorEvent: jest.fn(),
  buildDefaultDuplicateConflict: jest.fn(() => ({
    exists: false,
    connectionId: null,
    tenantId: null,
    providerAccountId: null,
    userHasAccess: false,
    canRequestAccess: false,
    canOpenClaim: false,
    reason: null,
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
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { probeHoldedConnection } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockProbeHoldedConnection = probeHoldedConnection as jest.Mock;
const mockTenantFindUnique = prisma.tenant.findUnique as jest.Mock;

describe('POST /api/holded/validate', () => {
  const originalSessionSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_SECRET = 'test-session-secret';

    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: 'ana@example.com',
    });
    mockProbeHoldedConnection.mockResolvedValue({
      ok: true,
      invoiceApi: { ok: true, status: 200 },
      accountingApi: { ok: true, status: 200 },
      crmApi: { ok: false, status: 403 },
      projectsApi: { ok: false, status: 403 },
      teamApi: { ok: false, status: 403 },
      error: null,
    });
    mockTenantFindUnique.mockResolvedValue({
      name: 'Acme SL',
      legalName: 'Acme Sociedad Limitada',
      nif: 'B12345678',
      profile: {
        tradeName: 'Acme SL',
        legalName: 'Acme Sociedad Limitada',
        taxId: 'B12345678',
      },
    });
  });

  afterAll(() => {
    process.env.SESSION_SECRET = originalSessionSecret;
  });

  it('returns a short-lived validation token after a successful probe', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'chatgpt',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(typeof payload.validationToken).toBe('string');
    expect(payload.validationToken.length).toBeGreaterThan(20);
    expect(payload.detectedCompany).toMatchObject({
      companyName: 'Acme SL',
      taxId: 'B12345678',
    });
    expect(payload.nextStep).toBe('manual_completion_required');
  });

  it('does not expose legacy tenant identity when profile is empty', async () => {
    mockTenantFindUnique.mockResolvedValueOnce({
      name: 'EMPRESA DEMO, SL',
      legalName: 'EMPRESA DEMO, SL',
      nif: 'B11111111',
      profile: null,
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'dashboard',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.detectedCompany).toBeNull();
  });
});
