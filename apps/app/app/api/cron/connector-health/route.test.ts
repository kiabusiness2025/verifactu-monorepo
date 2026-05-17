/** @jest-environment node */

jest.mock('@/lib/connectorHealth/checks', () => ({
  runAllConnectorHealthChecks: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    connectorHealthCheck: {
      createMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { runAllConnectorHealthChecks } from '@/lib/connectorHealth/checks';
import prisma from '@/lib/prisma';

const runMock = runAllConnectorHealthChecks as jest.MockedFunction<
  typeof runAllConnectorHealthChecks
>;
const createManyMock = prisma.connectorHealthCheck.createMany as jest.MockedFunction<
  typeof prisma.connectorHealthCheck.createMany
>;
const createMock = prisma.connectorHealthCheck.create as jest.MockedFunction<
  typeof prisma.connectorHealthCheck.create
>;

function buildRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/connector-health', {
    method: 'POST',
    headers,
  });
}

const sampleResults = [
  {
    connector: 'chatgpt' as const,
    checkType: 'landing',
    target: 'https://holded.verifactu.business/conectores/chatgpt',
    status: 'ok' as const,
    latencyMs: 120,
    httpStatus: 200,
    errorCode: null,
    errorMessage: null,
    metadata: null,
  },
  {
    connector: 'chatgpt' as const,
    checkType: 'tools_list',
    target: 'https://holded.verifactu.business/api/mcp/holded',
    status: 'fail' as const,
    latencyMs: 230,
    httpStatus: 200,
    errorCode: 'tool_count_mismatch' as const,
    errorMessage: 'expected 14 tools, got 13',
    metadata: { toolCount: 13, expected: 14 },
  },
];

describe('POST /api/cron/connector-health', () => {
  const envBackup = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envBackup };
    delete process.env.CRON_SECRET;
    Object.assign(process.env, { NODE_ENV: 'test' });
    runMock.mockResolvedValue(sampleResults);
    createManyMock.mockResolvedValue({ count: sampleResults.length });
  });

  afterAll(() => {
    process.env = envBackup;
  });

  it('rechaza cuando CRON_SECRET está seteado y no hay token', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const response = await POST(buildRequest());
    expect(response.status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it('acepta cuando CRON_SECRET coincide con Bearer header', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const response = await POST(buildRequest({ authorization: 'Bearer super-secret' }));
    expect(response.status).toBe(200);
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it('acepta cuando CRON_SECRET coincide con x-cron-secret header', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const response = await POST(buildRequest({ 'x-cron-secret': 'super-secret' }));
    expect(response.status).toBe(200);
  });

  it('en non-production sin CRON_SECRET, acepta sin auth (modo testing)', async () => {
    const response = await POST(buildRequest());
    expect(response.status).toBe(200);
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it('persiste resultados via createMany y devuelve summary con conteos', async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(createManyMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          connector: 'chatgpt',
          checkType: 'landing',
          status: 'ok',
          latencyMs: 120,
        }),
        expect.objectContaining({
          connector: 'chatgpt',
          checkType: 'tools_list',
          status: 'fail',
          errorCode: 'tool_count_mismatch',
        }),
      ]),
    });

    expect(body).toMatchObject({
      ok: false, // hay un fail → ok=false
      summary: { total: 2, ok: 1, degraded: 0, fail: 1 },
      failedChecks: [
        {
          connector: 'chatgpt',
          checkType: 'tools_list',
          errorCode: 'tool_count_mismatch',
        },
      ],
    });
  });

  it('fallback a createMany falla → inserts individuales', async () => {
    createManyMock.mockRejectedValueOnce(new Error('Prisma Accelerate createMany not supported'));
    createMock.mockResolvedValue({} as never);

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledTimes(sampleResults.length);
  });

  it('ok=true cuando todos los checks pasan', async () => {
    runMock.mockResolvedValueOnce([
      {
        ...sampleResults[0],
        checkType: 'landing',
      },
    ]);
    const response = await POST(buildRequest());
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.failedChecks).toEqual([]);
  });
});
