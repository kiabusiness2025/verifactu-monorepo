/** @jest-environment node */

jest.mock('@/lib/banking/reconciliationAutomation', () => ({
  getReconciliationMetrics: jest.fn(),
}));

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { getReconciliationMetrics } from '@/lib/banking/reconciliationAutomation';
import { requireTenantContext } from '@/lib/api/tenantAuth';

const metricsMock = getReconciliationMetrics as jest.MockedFunction<
  typeof getReconciliationMetrics
>;
const tenantAuthMock = requireTenantContext as jest.MockedFunction<typeof requireTenantContext>;

function buildRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/banks/reconciliation-metrics', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/banks/reconciliation-metrics', () => {
  const envBackup = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envBackup };
    delete process.env.MONITOR_API_TOKEN;
  });

  afterAll(() => {
    process.env = envBackup;
  });

  it('devuelve métricas globales con token de monitor', async () => {
    process.env.MONITOR_API_TOKEN = 'monitor-secret';
    metricsMock.mockResolvedValueOnce({
      generatedAt: new Date().toISOString(),
      scope: 'global',
      volumes: {
        totalTransactions: 100,
        totalUnreconciled: 20,
        staleUnreconciled7d: 8,
        unreconciledWithoutAudit: 3,
      },
      matching: {
        autoMatched30d: 40,
        suggested30d: 20,
        totalAudits30d: 60,
        autoMatchRatio: 0.66,
        avgScore30d: 0.82,
      },
      health: {
        unresolvedRiskRatio: 0.15,
        estimatedErrors: 3,
      },
    });

    const response = await GET(
      buildRequest({
        'x-monitor-token': 'monitor-secret',
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, scope: 'global' });
    expect(metricsMock).toHaveBeenCalledWith();
    expect(tenantAuthMock).not.toHaveBeenCalled();
  });

  it('requiere tenant auth para scope tenant', async () => {
    tenantAuthMock.mockResolvedValueOnce({ error: 'Unauthorized', status: 401 } as any);

    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
    expect(metricsMock).not.toHaveBeenCalled();
  });

  it('devuelve métricas por tenant cuando hay sesión', async () => {
    tenantAuthMock.mockResolvedValueOnce({ tenantId: 'tenant-1' } as any);
    metricsMock.mockResolvedValueOnce({
      generatedAt: new Date().toISOString(),
      scope: 'tenant',
      tenantId: 'tenant-1',
      volumes: {
        totalTransactions: 50,
        totalUnreconciled: 10,
        staleUnreconciled7d: 4,
        unreconciledWithoutAudit: 2,
      },
      matching: {
        autoMatched30d: 12,
        suggested30d: 8,
        totalAudits30d: 20,
        autoMatchRatio: 0.6,
        avgScore30d: 0.79,
      },
      health: {
        unresolvedRiskRatio: 0.2,
        estimatedErrors: 2,
      },
    });

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ ok: true, scope: 'tenant', tenantId: 'tenant-1' });
    expect(metricsMock).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
  });
});
