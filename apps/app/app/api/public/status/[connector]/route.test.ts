/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    connectorHealthCheck: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/connectorHealth/checks', () => ({
  getCheckDefinitions: jest.fn(() => [
    { connector: 'chatgpt', checkType: 'landing', target: 'https://holded.verifactu.business/conectores/chatgpt' },
    { connector: 'chatgpt', checkType: 'tools_list', target: 'https://holded.verifactu.business/api/mcp/holded' },
    { connector: 'claude', checkType: 'landing', target: 'https://claude.verifactu.business/' },
  ]),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import prisma from '@/lib/prisma';

const findManyMock = prisma.connectorHealthCheck.findMany as jest.MockedFunction<
  typeof prisma.connectorHealthCheck.findMany
>;

function buildRequest() {
  return new NextRequest('http://localhost/api/public/status/chatgpt');
}

function buildContext(connector: string) {
  return { params: Promise.resolve({ connector }) };
}

describe('GET /api/public/status/[connector]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza connectors desconocidos con 404', async () => {
    const response = await GET(buildRequest(), buildContext('unknown'));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('unknown_connector');
  });

  it('agrega checks por checkType y devuelve overall=operational si todos ok', async () => {
    const now = new Date();
    findManyMock.mockResolvedValue([
      {
        checkType: 'landing',
        status: 'ok',
        latencyMs: 100,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: now,
        target: 'https://holded.verifactu.business/conectores/chatgpt',
      },
      {
        checkType: 'tools_list',
        status: 'ok',
        latencyMs: 200,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: now,
        target: 'https://holded.verifactu.business/api/mcp/holded',
      },
    ] as never);

    const response = await GET(buildRequest(), buildContext('chatgpt'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connector).toBe('chatgpt');
    expect(body.overall).toBe('operational');
    expect(body.checks).toHaveLength(2);
    expect(body.checks[0].status).toBe('ok');
    expect(body.checksOk).toBe(2);
    expect(body.checksFail).toBe(0);
  });

  it('overall=down si cualquier check tiene status fail', async () => {
    findManyMock.mockResolvedValue([
      {
        checkType: 'tools_list',
        status: 'fail',
        latencyMs: 200,
        httpStatus: 200,
        errorCode: 'tool_count_mismatch',
        errorMessage: 'expected 14 tools, got 13',
        checkedAt: new Date(),
        target: 'https://holded.verifactu.business/api/mcp/holded',
      },
      {
        checkType: 'landing',
        status: 'ok',
        latencyMs: 100,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: new Date(),
        target: 'https://holded.verifactu.business/conectores/chatgpt',
      },
    ] as never);

    const response = await GET(buildRequest(), buildContext('chatgpt'));
    const body = await response.json();

    expect(body.overall).toBe('down');
    expect(body.checksFail).toBe(1);
    const failedCheck = body.checks.find((c: { checkType: string }) => c.checkType === 'tools_list');
    expect(failedCheck.lastErrorCode).toBe('tool_count_mismatch');
    expect(failedCheck.lastErrorMessage).toContain('expected 14 tools');
  });

  it('overall=degraded si al menos un check tiene status degraded y ninguno fail', async () => {
    findManyMock.mockResolvedValue([
      {
        checkType: 'landing',
        status: 'degraded',
        latencyMs: 3500,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: new Date(),
        target: '',
      },
      {
        checkType: 'tools_list',
        status: 'ok',
        latencyMs: 200,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: new Date(),
        target: '',
      },
    ] as never);

    const response = await GET(buildRequest(), buildContext('chatgpt'));
    const body = await response.json();
    expect(body.overall).toBe('degraded');
  });

  it('overall=unknown si no hay ningún check en DB', async () => {
    findManyMock.mockResolvedValue([] as never);

    const response = await GET(buildRequest(), buildContext('chatgpt'));
    const body = await response.json();
    expect(body.overall).toBe('unknown');
    expect(body.checks).toHaveLength(2); // las definiciones esperadas se incluyen igual
    expect(body.checks.every((c: { status: string }) => c.status === 'unknown')).toBe(true);
  });

  it('calcula uptime24h por check considerando ok+degraded como "OK"', async () => {
    const recent = new Date();
    findManyMock.mockResolvedValue([
      {
        checkType: 'landing',
        status: 'ok',
        latencyMs: 100,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: recent,
        target: '',
      },
      {
        checkType: 'landing',
        status: 'degraded',
        latencyMs: 3500,
        httpStatus: 200,
        errorCode: null,
        errorMessage: null,
        checkedAt: recent,
        target: '',
      },
      {
        checkType: 'landing',
        status: 'fail',
        latencyMs: 0,
        httpStatus: null,
        errorCode: 'timeout',
        errorMessage: 'aborted',
        checkedAt: recent,
        target: '',
      },
    ] as never);

    const response = await GET(buildRequest(), buildContext('chatgpt'));
    const body = await response.json();
    const landing = body.checks.find((c: { checkType: string }) => c.checkType === 'landing');
    // 2 OK (ok + degraded), 1 fail → 66.7%
    expect(landing.uptime24hPct).toBeCloseTo(66.7, 1);
    expect(landing.sampleCount24h).toBe(3);
  });

  it('expone CORS y Cache-Control para edge caching', async () => {
    findManyMock.mockResolvedValue([] as never);
    const response = await GET(buildRequest(), buildContext('chatgpt'));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cache-Control')).toMatch(/s-maxage=60/);
  });

  it('devuelve overall=unknown con status=200 si la DB falla (no rompe la landing)', async () => {
    findManyMock.mockRejectedValueOnce(new Error('connection refused'));

    const response = await GET(buildRequest(), buildContext('chatgpt'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.overall).toBe('unknown');
    expect(body.error).toBe('status_unavailable');
  });
});
