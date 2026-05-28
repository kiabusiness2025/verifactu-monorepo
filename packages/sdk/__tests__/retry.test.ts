import {
  IsaakClient,
  IsaakError,
  ServerError,
  computeBackoff,
  isErrorRetriable,
  withRetry,
} from '../src/index.js';

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

const noSleep = (_ms: number): Promise<void> => Promise.resolve();

const jsonRes = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('withRetry', () => {
  it('retries failures up to maxRetries then throws', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(
      withRetry(fn, {
        maxRetries: 2,
        isRetriable: () => true,
        sleep: noSleep,
      }),
    ).rejects.toThrow('boom');
    // initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('returns the value on second attempt', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('boom'));
      return Promise.resolve('ok');
    });
    const value = await withRetry(fn, {
      maxRetries: 3,
      isRetriable: () => true,
      sleep: noSleep,
    });
    expect(value).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry when isRetriable returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(
      withRetry(fn, {
        maxRetries: 5,
        isRetriable: () => false,
        sleep: noSleep,
      }),
    ).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('computeBackoff stays within the cap', () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const value = computeBackoff(attempt, 100, 500);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(500);
    }
  });
});

describe('isErrorRetriable', () => {
  it('retries IsaakError on 5xx for GET', () => {
    const err = new IsaakError('boom', 'server_error', 503);
    expect(
      isErrorRetriable(err, { method: 'GET', hasIdempotencyKey: false }),
    ).toBe(true);
  });

  it('does not retry POST on 5xx without Idempotency-Key', () => {
    const err = new IsaakError('boom', 'server_error', 503);
    expect(
      isErrorRetriable(err, { method: 'POST', hasIdempotencyKey: false }),
    ).toBe(false);
  });

  it('retries POST on 5xx when Idempotency-Key is set', () => {
    const err = new IsaakError('boom', 'server_error', 503);
    expect(
      isErrorRetriable(err, { method: 'POST', hasIdempotencyKey: true }),
    ).toBe(true);
  });

  it('does not retry on 4xx (other than 429)', () => {
    const err = new IsaakError('bad', 'bad_request', 400);
    expect(
      isErrorRetriable(err, { method: 'GET', hasIdempotencyKey: false }),
    ).toBe(false);
  });
});

describe('IsaakClient retry integration', () => {
  it('retries GET on 503 and eventually returns 200', async () => {
    const success = {
      ok: true,
      data: {
        id: 'cmp',
        legalName: 'X',
        cif: 'B1',
        verifactuEnabled: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      requestId: 'r',
    };
    let call = 0;
    const fetchMock: FetchMock = jest.fn().mockImplementation(() => {
      call += 1;
      if (call < 3) return Promise.resolve(jsonRes(503, { ok: false, error: { code: 's', message: 'down' } }));
      return Promise.resolve(jsonRes(200, success));
    });

    const client = new IsaakClient({
      apiKey: 'isk_test_x',
      fetch: fetchMock as unknown as typeof fetch,
      maxRetries: 3,
    });

    // patch sleep so the test runs fast — override retry options is internal,
    // so use small base delay via injection in withRetry's compute fallback.
    const result = await client.companies.getCurrent();
    expect(result.id).toBe('cmp');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 15_000);

  it('does NOT retry POST without Idempotency-Key on 503', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      jsonRes(503, { ok: false, error: { code: 'down', message: 'maintenance' } }),
    );
    const client = new IsaakClient({
      apiKey: 'isk_test_x',
      fetch: fetchMock as unknown as typeof fetch,
      maxRetries: 5,
    });

    await expect(
      client.request('/api/v1/no-retry', {
        method: 'POST',
        body: { x: 1 },
      }),
    ).rejects.toBeInstanceOf(ServerError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
