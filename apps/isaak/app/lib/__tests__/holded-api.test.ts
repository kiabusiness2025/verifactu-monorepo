/**
 * Tests for holdedGetPnL and holdedGetVerifactuStatus.
 *
 * fetch is mocked globally per test; AbortController + setTimeout
 * are Node.js globals that need no special setup.
 */

import { holdedGetDocumentPdf, holdedGetPnL, holdedGetVerifactuStatus } from '../holded-api';

const API_KEY = 'test-api-key';

function mockFetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response);
}

function mockFetchErr(status: number) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── holdedGetPnL ─────────────────────────────────────────────────────────────

describe('holdedGetPnL', () => {
  it('returns all-zero P&L when dailyledger is empty', async () => {
    global.fetch = mockFetchOk([]);
    const result = await holdedGetPnL(API_KEY);

    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.grossProfit).toBe(0);
    expect(result.margin).toBeNull();
    expect(result.entriesProcessed).toBe(0);
  });

  it('aggregates 7xx accounts as income (credit − debit)', async () => {
    global.fetch = mockFetchOk([
      { account: '700', credit: 1000, debit: 0 },
      { account: '705', credit: 500, debit: 50 }, // net = 450
    ]);
    const result = await holdedGetPnL(API_KEY);

    expect(result.income).toBe(1450);
    expect(result.expenses).toBe(0);
    expect(result.grossProfit).toBe(1450);
    expect(result.margin).toBe(100);
    expect(result.entriesProcessed).toBe(2);
  });

  it('aggregates 6xx accounts as expenses using Math.abs(net)', async () => {
    global.fetch = mockFetchOk([
      { account: '600', credit: 0, debit: 800 },  // net = −800 → expenses += 800
      { account: '622', credit: 100, debit: 400 }, // net = −300 → expenses += 300
    ]);
    const result = await holdedGetPnL(API_KEY);

    expect(result.expenses).toBe(1100);
    expect(result.income).toBe(0);
    expect(result.grossProfit).toBe(-1100);
    expect(result.margin).toBeNull(); // income is 0
  });

  it('ignores non-7xx / non-6xx PGC accounts', async () => {
    global.fetch = mockFetchOk([
      { account: '430', credit: 5000, debit: 0 }, // clientes — not income
      { account: '572', credit: 0, debit: 2000 }, // banco — not expense
      { account: '100', credit: 0, debit: 3000 }, // capital — not expense
    ]);
    const result = await holdedGetPnL(API_KEY);

    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.grossProfit).toBe(0);
    expect(result.margin).toBeNull();
  });

  it('computes margin correctly as percentage rounded to 2 dp', async () => {
    global.fetch = mockFetchOk([
      { account: '700', credit: 1000, debit: 0 },
      { account: '600', credit: 0, debit: 600 },
    ]);
    const result = await holdedGetPnL(API_KEY);

    expect(result.income).toBe(1000);
    expect(result.expenses).toBe(600);
    expect(result.grossProfit).toBe(400);
    expect(result.margin).toBe(40); // 400/1000 * 100 = 40%
  });

  it('uses Spanish PGC field aliases (haber / debe) when credit/debit absent', async () => {
    global.fetch = mockFetchOk([
      { account: '700', haber: 2000, debe: 0 },
      { account: '600', haber: 0, debe: 500 },
    ]);
    const result = await holdedGetPnL(API_KEY);

    expect(result.income).toBe(2000);
    expect(result.expenses).toBe(500);
  });

  it('handles non-array dailyledger response gracefully', async () => {
    global.fetch = mockFetchOk({ error: 'no data' });
    const result = await holdedGetPnL(API_KEY);

    expect(result.income).toBe(0);
    expect(result.entriesProcessed).toBe(0);
  });

  it('retries once on HTTP 429 and returns result on second attempt', async () => {
    jest.useFakeTimers();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ account: '700', credit: 500, debit: 0 }],
      } as unknown as Response);

    const promise = holdedGetPnL(API_KEY);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
    expect(result.income).toBe(500);

    jest.useRealTimers();
  });

  it('throws on non-retryable HTTP error (404)', async () => {
    global.fetch = mockFetchErr(404);
    await expect(holdedGetPnL(API_KEY)).rejects.toThrow('Holded API 404');
  });
});

// ── holdedGetVerifactuStatus ──────────────────────────────────────────────────

describe('holdedGetVerifactuStatus', () => {
  it('returns active=true when verifactu.uuid is present', async () => {
    global.fetch = mockFetchOk({
      id: 'inv-1',
      verifactu: { uuid: 'abc-123', qr: 'QR_BASE64', huella: 'HASH_VAL' },
    });
    const result = await holdedGetVerifactuStatus(API_KEY, 'inv-1');

    expect(result.active).toBe(true);
    expect(result.uuid).toBe('abc-123');
    expect(result.qrBase64).toBe('QR_BASE64');
    expect(result.huella).toBe('HASH_VAL');
    expect(result.invoiceId).toBe('inv-1');
  });

  it('returns active=true when verifactuData field is used instead', async () => {
    global.fetch = mockFetchOk({
      id: 'inv-2',
      verifactuData: { uuid: 'def-456', qr_base64: 'QR2', hash: 'H2', fecha: '2024-06-01' },
    });
    const result = await holdedGetVerifactuStatus(API_KEY, 'inv-2');

    expect(result.active).toBe(true);
    expect(result.uuid).toBe('def-456');
    expect(result.qrBase64).toBe('QR2');
    expect(result.huella).toBe('H2');
    expect(result.sentAt).toBe('2024-06-01');
  });

  it('returns active=true from top-level verifactuUuid + qrCode fields', async () => {
    global.fetch = mockFetchOk({ id: 'inv-3', verifactuUuid: 'ghi-789', qrCode: 'QR3' });
    const result = await holdedGetVerifactuStatus(API_KEY, 'inv-3');

    expect(result.active).toBe(true);
    expect(result.uuid).toBe('ghi-789');
    expect(result.qrBase64).toBe('QR3');
  });

  it('returns active=false when no Verifactu fields are present', async () => {
    global.fetch = mockFetchOk({ id: 'inv-4', total: 1000, status: 'paid' });
    const result = await holdedGetVerifactuStatus(API_KEY, 'inv-4');

    expect(result.active).toBe(false);
    expect(result.uuid).toBeNull();
    expect(result.qrBase64).toBeNull();
    expect(result.huella).toBeNull();
    expect(result.sentAt).toBeNull();
  });

  it('throws on Holded soft error (status: 0)', async () => {
    global.fetch = mockFetchOk({ status: 0, info: 'Invoice not found' });
    await expect(holdedGetVerifactuStatus(API_KEY, 'inv-5')).rejects.toThrow('Holded soft error');
  });

  it('throws on HTTP 404', async () => {
    global.fetch = mockFetchErr(404);
    await expect(holdedGetVerifactuStatus(API_KEY, 'inv-6')).rejects.toThrow('Holded API 404');
  });

  it('retries on HTTP 503 and succeeds on second attempt', async () => {
    jest.useFakeTimers();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'inv-7', verifactuUuid: 'retry-uuid' }),
      } as unknown as Response);

    const promise = holdedGetVerifactuStatus(API_KEY, 'inv-7');
    await jest.runAllTimersAsync();
    const result = await promise;

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
    expect(result.active).toBe(true);
    expect(result.uuid).toBe('retry-uuid');

    jest.useRealTimers();
  });
});

// ── holdedGetDocumentPdf ──────────────────────────────────────────────────────
describe('holdedGetDocumentPdf', () => {
  it('returns base64 when Holded responds with real PDF magic bytes', async () => {
    const pdfBytes = new Uint8Array(Buffer.from('%PDF-1.4 fake pdf body', 'utf8'));
    const isolated = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/pdf' : null) },
      arrayBuffer: async () => isolated,
    } as unknown as Response);

    const result = await holdedGetDocumentPdf(API_KEY, 'invoice', 'doc-1');
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.base64.length).toBeGreaterThan(0);
    // Decoded base64 must start with %PDF-
    expect(Buffer.from(result.base64, 'base64').toString('latin1').startsWith('%PDF-')).toBe(true);
  });

  it('V3.F.II: rejects fake PDF responses where Holded returns JSON error with HTTP 200', async () => {
    // Mismo bug que ya cerramos en apps/app/lib/integrations/accounting.ts:
    // Holded a veces devuelve 200 + JSON cuando el documento no tiene PDF.
    // Antes Isaak encodeaba ese JSON como base64 y devolvía
    // `mimeType: 'application/pdf'` mentiroso en el wrapper de holded-tools.ts.
    const fakeBody = '{"status":0,"error":"Document has no PDF attachment"}';
    const bytes = new Uint8Array(Buffer.from(fakeBody, 'utf8'));
    const isolated = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      arrayBuffer: async () => isolated,
    } as unknown as Response);

    await expect(holdedGetDocumentPdf(API_KEY, 'invoice', 'doc-1')).rejects.toThrow(
      /no PDF.*Document has no PDF attachment/
    );
  });
});
