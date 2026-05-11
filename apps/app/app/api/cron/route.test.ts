/** @jest-environment node */

jest.mock('@/lib/banking/reconciliationAutomation', () => ({
  runGlobalReconciliationReevaluation: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { runGlobalReconciliationReevaluation } from '@/lib/banking/reconciliationAutomation';

const runMock = runGlobalReconciliationReevaluation as jest.MockedFunction<
  typeof runGlobalReconciliationReevaluation
>;

function buildRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/cron', () => {
  const envBackup = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envBackup };
    delete process.env.CRON_SECRET;
    Object.assign(process.env, { NODE_ENV: 'test' });
  });

  afterAll(() => {
    process.env = envBackup;
  });

  it('rechaza cuando CRON_SECRET existe y no se envía token', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const response = await POST(buildRequest());
    expect(response.status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it('acepta Bearer token correcto y ejecuta reevaluación', async () => {
    process.env.CRON_SECRET = 'super-secret';
    runMock.mockResolvedValueOnce({
      tenantCount: 2,
      scanned: 10,
      autoMatched: 6,
      suggestedOnly: 4,
      alertsCreated: 1,
      tenantResults: [
        {
          tenantId: 't1',
          scanned: 5,
          autoMatched: 3,
          suggestedOnly: 2,
          alertCreated: true,
        },
      ],
      errors: [],
    });

    const response = await POST(
      buildRequest({
        authorization: 'Bearer super-secret',
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      ok: true,
      kind: 'bank_reconciliation_reevaluation',
      summary: {
        tenantCount: 2,
        scanned: 10,
        autoMatched: 6,
        suggestedOnly: 4,
        alertsCreated: 1,
        errors: 0,
      },
    });
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve 500 si el proceso falla', async () => {
    process.env.CRON_SECRET = 'super-secret';
    runMock.mockRejectedValueOnce(new Error('boom'));

    const response = await POST(
      buildRequest({
        authorization: 'Bearer super-secret',
      })
    );

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toMatchObject({ ok: false, error: 'Bank reconciliation cron failed' });
  });
});
