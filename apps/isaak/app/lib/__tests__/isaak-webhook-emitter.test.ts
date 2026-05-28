import {
  ISAAK_WEBHOOK_EVENTS,
  isValidWebhookEventType,
  emitWebhookEvent,
  retryPendingWebhooks,
} from '../isaak-webhook-emitter';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockEndpoints: Record<
  string,
  {
    id: string;
    tenantId: string;
    url: string;
    secret: string;
    events: string[];
    active: boolean;
    createdAt: Date;
  }[]
> = {};

const mockDeliveries: Record<
  string,
  {
    id: string;
    endpointId: string;
    tenantId: string;
    eventType: string;
    payload: object;
    status: string;
    attempts: number;
    nextRetryAt: Date | null;
    lastStatusCode: number | null;
    lastError: string | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    endpoint?: { id: string; url: string; secret: string; active: boolean };
  }
> = {};

let deliveryIdSeq = 0;

jest.mock('../prisma', () => ({
  prisma: {
    isaakWebhookEndpoint: {
      findMany: jest.fn(async ({ where }: { where: { tenantId: string; active: boolean } }) => {
        return (mockEndpoints[where.tenantId] ?? []).filter((ep) => ep.active === where.active);
      }),
    },
    isaakWebhookDelivery: {
      create: jest.fn(async ({ data }: { data: object }) => {
        const d = {
          id: `del_${++deliveryIdSeq}`,
          nextRetryAt: null,
          lastStatusCode: null,
          lastError: null,
          deliveredAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(data as object),
        } as (typeof mockDeliveries)[string];
        mockDeliveries[d.id] = d;
        return d;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        Object.assign(mockDeliveries[where.id]!, data);
        return mockDeliveries[where.id];
      }),
      findMany: jest.fn(
        async ({
          where,
          include,
          take,
        }: {
          where: { status: string; nextRetryAt: { lte: Date }; attempts: { lt: number } };
          include?: { endpoint?: boolean };
          take: number;
        }) => {
          return Object.values(mockDeliveries)
            .filter(
              (d) =>
                d.status === where.status &&
                d.nextRetryAt !== null &&
                d.nextRetryAt <= where.nextRetryAt.lte &&
                d.attempts < where.attempts.lt
            )
            .slice(0, take)
            .map((d) => (include?.endpoint ? { ...d, endpoint: d.endpoint } : d));
        }
      ),
    },
  },
}));

// ─── fetch mock ──────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockFetchOk(status = 200) {
  mockFetch.mockResolvedValue({ status, ok: status >= 200 && status < 300 });
}
function mockFetchFail(error = 'network error') {
  mockFetch.mockRejectedValue(new Error(error));
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function addEndpoint(
  tenantId: string,
  opts: Partial<{
    id: string;
    url: string;
    secret: string;
    events: string[];
    active: boolean;
  }> = {}
) {
  if (!mockEndpoints[tenantId]) mockEndpoints[tenantId] = [];
  const ep = {
    id: opts.id ?? `ep_${tenantId}_${mockEndpoints[tenantId]!.length}`,
    tenantId,
    url: opts.url ?? 'https://example.com/hook',
    secret: opts.secret ?? 'test-secret',
    events: opts.events ?? [],
    active: opts.active ?? true,
    createdAt: new Date(),
  };
  mockEndpoints[tenantId]!.push(ep);
  return ep;
}

beforeEach(() => {
  for (const k of Object.keys(mockEndpoints)) delete mockEndpoints[k];
  for (const k of Object.keys(mockDeliveries)) delete mockDeliveries[k];
  deliveryIdSeq = 0;
  mockFetch.mockReset();
});

// ─── event catalogue ─────────────────────────────────────────────────────────

describe('ISAAK_WEBHOOK_EVENTS', () => {
  it('contains exactly 9 event types', () => {
    expect(ISAAK_WEBHOOK_EVENTS).toHaveLength(9);
  });

  it('includes the core billing and fiscal events', () => {
    const events = ISAAK_WEBHOOK_EVENTS as ReadonlyArray<string>;
    expect(events).toContain('invoice.created');
    expect(events).toContain('verifactu.submitted');
    expect(events).toContain('tax_return.submitted');
    expect(events).toContain('chat.completed');
  });

  it('isValidWebhookEventType returns true for known events', () => {
    expect(isValidWebhookEventType('invoice.created')).toBe(true);
    expect(isValidWebhookEventType('chat.completed')).toBe(true);
  });

  it('isValidWebhookEventType returns false for unknown strings', () => {
    expect(isValidWebhookEventType('unknown.event')).toBe(false);
    expect(isValidWebhookEventType('')).toBe(false);
  });
});

// ─── emitWebhookEvent ────────────────────────────────────────────────────────

describe('emitWebhookEvent', () => {
  it('returns zeros when no active endpoints', async () => {
    const result = await emitWebhookEvent('tenant-1', 'invoice.created', { id: '123' });
    expect(result).toEqual({ endpointsFired: 0, delivered: 0, queued: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('delivers to a subscribed endpoint and marks delivered', async () => {
    addEndpoint('tenant-1', { events: ['invoice.created'] });
    mockFetchOk(200);

    const result = await emitWebhookEvent('tenant-1', 'invoice.created', { id: 'inv-1' });

    expect(result.endpointsFired).toBe(1);
    expect(result.delivered).toBe(1);
    expect(result.queued).toBe(0);

    const [delivery] = Object.values(mockDeliveries);
    expect(delivery?.status).toBe('delivered');
    expect(delivery?.attempts).toBe(1);
    expect(delivery?.deliveredAt).not.toBeNull();
  });

  it('skips endpoint whose events array does not include the event', async () => {
    addEndpoint('tenant-1', { events: ['invoice.sent'] }); // only subscribes to invoice.sent
    mockFetchOk(200);

    const result = await emitWebhookEvent('tenant-1', 'invoice.created', { id: 'inv-1' });

    expect(result.endpointsFired).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('endpoint with empty events array receives all event types', async () => {
    addEndpoint('tenant-1', { events: [] }); // subscribe to all
    mockFetchOk(200);

    const result = await emitWebhookEvent('tenant-1', 'chat.completed', {});

    expect(result.endpointsFired).toBe(1);
    expect(result.delivered).toBe(1);
  });

  it('queues delivery for retry when fetch fails', async () => {
    addEndpoint('tenant-1');
    mockFetchFail('connection refused');

    const result = await emitWebhookEvent('tenant-1', 'invoice.created', { id: 'inv-2' });

    expect(result.queued).toBe(1);
    expect(result.delivered).toBe(0);

    const [delivery] = Object.values(mockDeliveries);
    expect(delivery?.status).toBe('failed');
    expect(delivery?.nextRetryAt).not.toBeNull();
    expect(delivery?.lastError).toContain('connection refused');
  });

  it('queues delivery when server returns 5xx', async () => {
    addEndpoint('tenant-1');
    mockFetchOk(503);

    const result = await emitWebhookEvent('tenant-1', 'invoice.created', {});

    expect(result.queued).toBe(1);
    const [delivery] = Object.values(mockDeliveries);
    expect(delivery?.status).toBe('failed');
    expect(delivery?.lastStatusCode).toBe(503);
  });

  it('sends correct headers including HMAC signature', async () => {
    addEndpoint('tenant-1', { secret: 'my-secret' });
    mockFetchOk(200);

    await emitWebhookEvent('tenant-1', 'invoice.created', { id: 'inv-3' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Isaak-Event']).toBe('invoice.created');
    expect(headers['X-Isaak-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(headers['X-Isaak-Timestamp']).toMatch(/^\d+$/);
  });

  it('fires to multiple endpoints for the same tenant', async () => {
    addEndpoint('tenant-2', { url: 'https://a.example.com/hook', events: [] });
    addEndpoint('tenant-2', { url: 'https://b.example.com/hook', events: [] });
    mockFetchOk(200);
    mockFetchOk(200);

    const result = await emitWebhookEvent('tenant-2', 'verifactu.submitted', {});

    expect(result.endpointsFired).toBe(2);
    expect(result.delivered).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ─── retryPendingWebhooks ─────────────────────────────────────────────────────

describe('retryPendingWebhooks', () => {
  it('returns zeros when no due deliveries', async () => {
    const result = await retryPendingWebhooks();
    expect(result).toEqual({ processed: 0, delivered: 0, dead: 0, errors: 0 });
  });

  it('delivers a due failed delivery and marks it delivered', async () => {
    const ep = { id: 'ep-retry-1', url: 'https://example.com/hook', secret: 'sec', active: true };
    mockDeliveries['del-retry-1'] = {
      id: 'del-retry-1',
      endpointId: ep.id,
      tenantId: 'tenant-3',
      eventType: 'invoice.created',
      payload: {
        id: 'evt-1',
        event: 'invoice.created',
        timestamp: '2026-05-28T00:00:00Z',
        data: {},
      },
      status: 'failed',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 1000), // past
      lastStatusCode: 503,
      lastError: null,
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      endpoint: ep,
    };

    mockFetchOk(200);
    const result = await retryPendingWebhooks();

    expect(result.processed).toBe(1);
    expect(result.delivered).toBe(1);
    expect(mockDeliveries['del-retry-1']?.status).toBe('delivered');
  });

  it('marks dead after MAX_ATTEMPTS failures', async () => {
    const ep = { id: 'ep-retry-2', url: 'https://example.com/hook', secret: 'sec', active: true };
    mockDeliveries['del-retry-2'] = {
      id: 'del-retry-2',
      endpointId: ep.id,
      tenantId: 'tenant-4',
      eventType: 'invoice.created',
      payload: {},
      status: 'failed',
      attempts: 2, // one more → dead
      nextRetryAt: new Date(Date.now() - 1000),
      lastStatusCode: null,
      lastError: null,
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      endpoint: ep,
    };

    mockFetchFail('timeout');
    const result = await retryPendingWebhooks();

    expect(result.processed).toBe(1);
    expect(result.dead).toBe(1);
    expect(mockDeliveries['del-retry-2']?.status).toBe('dead');
  });

  it('marks inactive endpoint deliveries as dead without fetching', async () => {
    const ep = { id: 'ep-retry-3', url: 'https://example.com/hook', secret: 'sec', active: false };
    mockDeliveries['del-retry-3'] = {
      id: 'del-retry-3',
      endpointId: ep.id,
      tenantId: 'tenant-5',
      eventType: 'chat.completed',
      payload: {},
      status: 'failed',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 1000),
      lastStatusCode: null,
      lastError: null,
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      endpoint: ep,
    };

    const result = await retryPendingWebhooks();

    expect(result.dead).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
