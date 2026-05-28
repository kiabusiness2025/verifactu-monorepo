import {
  AuthenticationError,
  IsaakClient,
  IsaakError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../src/index.js';

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

const makeJsonResponse = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response => {
  const allHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-request-id': headers['x-request-id'] ?? 'req_test_1',
    ...headers,
  };
  return new Response(JSON.stringify(body), { status, headers: allHeaders });
};

function buildClient(fetchMock: FetchMock): IsaakClient {
  return new IsaakClient({
    apiKey: 'isk_test_abc',
    fetch: fetchMock as unknown as typeof fetch,
    maxRetries: 0,
  });
}

describe('IsaakClient', () => {
  it('requires an apiKey', () => {
    expect(
      () => new IsaakClient({ apiKey: '' as unknown as string }),
    ).toThrow(/apiKey/);
  });

  it('sends Authorization Bearer + Accept headers and composes the URL', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(200, {
        ok: true,
        data: { id: 'cmp_1', legalName: 'ACME SL' },
        requestId: 'req_x',
      }),
    );
    const client = buildClient(fetchMock);

    await client.companies.getCurrent();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://isaak.verifactu.business/api/v1/companies/current');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer isk_test_abc');
    expect(headers.Accept).toBe('application/json');
    expect(headers['User-Agent']).toMatch(/^verifactu-sdk-js\//);
  });

  it('parses the data envelope on 200', async () => {
    const company = {
      id: 'cmp_1',
      legalName: 'ACME SL',
      cif: 'B12345678',
      verifactuEnabled: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(200, { ok: true, data: company, requestId: 'req_x' }),
    );
    const client = buildClient(fetchMock);

    const result = await client.companies.getCurrent();
    expect(result).toEqual(company);
  });

  it('throws RateLimitError on 429 with retryAfterSeconds parsed', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(
        429,
        {
          ok: false,
          error: { code: 'rate_limit_exceeded', message: 'Too many requests' },
          requestId: 'req_rl',
        },
        { 'retry-after': '7', 'x-request-id': 'req_rl' },
      ),
    );
    const client = buildClient(fetchMock);

    await expect(client.invoices.list()).rejects.toMatchObject({
      name: 'RateLimitError',
      code: 'rate_limit_exceeded',
      httpStatus: 429,
      requestId: 'req_rl',
      retryAfterSeconds: 7,
    });

    const fetchMock2: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(
        429,
        {
          ok: false,
          error: { code: 'rate_limit_exceeded', message: 'Too many requests' },
        },
        { 'retry-after': '7' },
      ),
    );
    const client2 = buildClient(fetchMock2);
    try {
      await client2.invoices.list();
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err).toBeInstanceOf(IsaakError);
    }
  });

  it('maps 401 → AuthenticationError', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(401, {
        ok: false,
        error: { code: 'unauthorized', message: 'Bad key' },
      }),
    );
    const client = buildClient(fetchMock);
    await expect(client.companies.getCurrent()).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it('maps 404 → NotFoundError', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(404, {
        ok: false,
        error: { code: 'not_found', message: 'Missing' },
      }),
    );
    const client = buildClient(fetchMock);
    await expect(client.invoices.get('inv_404')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('maps 422 → ValidationError with details', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(422, {
        ok: false,
        error: {
          code: 'validation_error',
          message: 'NIF invalid',
          details: { field: 'customer.cif' },
        },
      }),
    );
    const client = buildClient(fetchMock);
    await expect(
      client.invoices.create({
        customer: { name: 'X' },
        lines: [],
      }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      details: { field: 'customer.cif' },
    });
  });

  it('attaches Idempotency-Key on POST when idempotent: true', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(200, {
        ok: true,
        data: {
          id: 'inv_1',
          status: 'draft',
          customer: { name: 'X' },
          lines: [],
          subtotal: 0,
          vatTotal: 0,
          total: 0,
          currency: 'EUR',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        requestId: 'req_x',
      }),
    );
    const client = buildClient(fetchMock);
    await client.invoices.create({
      customer: { name: 'X' },
      lines: [{ description: 'L', quantity: 1, unitPrice: 100, vatRate: 21 }],
    });

    const headers = fetchMock.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBeTruthy();
    expect(headers['Idempotency-Key'].length).toBeGreaterThan(8);
  });

  it('respects custom baseUrl trimming trailing slashes', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(200, { ok: true, data: { id: 'c' }, requestId: 'r' }),
    );
    const client = new IsaakClient({
      apiKey: 'isk_test_x',
      baseUrl: 'https://staging.example.com/',
      fetch: fetchMock as unknown as typeof fetch,
      maxRetries: 0,
    });
    await client.companies.getCurrent();
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://staging.example.com/api/v1/companies/current',
    );
  });

  it('serializes query params and skips undefined values', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      makeJsonResponse(200, {
        ok: true,
        data: [],
        requestId: 'r',
        pagination: { nextCursor: null, hasMore: false, limit: 50 },
      }),
    );
    const client = buildClient(fetchMock);
    await client.invoices.list({ from: '2026-01-01', limit: 10 });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('limit=10');
    expect(url).not.toContain('to=');
    expect(url).not.toContain('status=');
  });
});
