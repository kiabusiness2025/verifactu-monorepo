/**
 * D1 — dispatchPendingDeliveries.
 *
 * Mocks the global `fetch` and the Prisma client. Verifies:
 *  - 2xx → status='delivered', deliveredAt set, attempts incremented.
 *  - 5xx → status stays 'pending', attempts incremented, backoff applied
 *    via nextAttemptAt (60s for attempt #1).
 *  - After 6 failed attempts the row moves to status='dead'.
 *  - Signed headers (x-isaak-signature, x-isaak-timestamp, x-isaak-event-id)
 *    are present and the signature verifies against the row's endpoint
 *    secret.
 *  - backoffSeconds() returns the documented schedule.
 */
const findManyMock = jest.fn();
const updateMock = jest.fn();
const updateManyMock = jest.fn();

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    isaakWebhookDelivery: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
  },
}));

import { verifySignature } from '../../webhooks/signer';
import {
  dispatchPendingDeliveries,
  backoffSeconds,
  MAX_ATTEMPTS,
} from '../../webhooks/dispatch';

type FetchMock = jest.Mock<Promise<Response>, [url: string, init?: RequestInit]>;

const originalFetch = global.fetch;
let fetchMock: FetchMock;

function mockFetchResponse(status: number, bodyText = '') {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => bodyText,
  } as Response);
}

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'del_1',
    endpointId: 'ep_1',
    eventId: 'evt_test_1',
    payload: { id: 'evt_test_1', type: 'invoice.issued', data: { invoiceId: 'inv_1' } },
    attempts: 0,
    endpoint: { url: 'https://example.com/hook', secret: 'whsec_test', active: true },
    ...overrides,
  };
}

beforeEach(() => {
  findManyMock.mockReset();
  updateMock.mockReset();
  updateMock.mockResolvedValue({});
  updateManyMock.mockReset();
  // Default: claim succeeds (CAS matched the row exactly as we read it).
  updateManyMock.mockResolvedValue({ count: 1 });
  fetchMock = jest.fn() as FetchMock;
  global.fetch = fetchMock as unknown as typeof global.fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('backoffSeconds', () => {
  test('matches the documented schedule (1m, 5m, 30m, 2h, 12h, 24h)', () => {
    expect(backoffSeconds(1)).toBe(60);
    expect(backoffSeconds(2)).toBe(300);
    expect(backoffSeconds(3)).toBe(1800);
    expect(backoffSeconds(4)).toBe(7200);
    expect(backoffSeconds(5)).toBe(43_200);
    expect(backoffSeconds(6)).toBe(86_400);
  });

  test('clamps out-of-range attempt numbers', () => {
    expect(backoffSeconds(0)).toBe(60);
    expect(backoffSeconds(99)).toBe(86_400);
  });
});

describe('dispatchPendingDeliveries — success path', () => {
  test('2xx → status=delivered, deliveredAt set, attempts incremented', async () => {
    findManyMock.mockResolvedValue([deliveryRow()]);
    mockFetchResponse(200, 'ok');

    const summary = await dispatchPendingDeliveries({ batchSize: 50 });

    expect(summary).toEqual({ processed: 1, delivered: 1, failed: 0, dead: 0 });
    // One atomic claim (updateMany with CAS) + one final result (update).
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);

    const claim = updateManyMock.mock.calls[0][0];
    expect(claim.where).toMatchObject({ id: 'del_1', status: 'pending', attempts: 0 });
    expect(claim.data.attempts).toBe(1);
    expect(claim.data.nextAttemptAt).toBeInstanceOf(Date);

    const call = updateMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'del_1' });
    expect(call.data.status).toBe('delivered');
    expect(call.data.attempts).toBeUndefined(); // already bumped in claim
    expect(call.data.deliveredAt).toBeInstanceOf(Date);
    expect(call.data.lastStatusCode).toBe(200);
    expect(call.data.nextAttemptAt).toBeNull();
  });

  test('concurrent dispatcher already claimed row → updateMany.count=0, no fetch, no final update', async () => {
    findManyMock.mockResolvedValue([deliveryRow()]);
    updateManyMock.mockResolvedValueOnce({ count: 0 }); // someone else won the CAS

    const summary = await dispatchPendingDeliveries();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(summary).toEqual({ processed: 1, delivered: 0, failed: 0, dead: 0 });
  });

  test('sends signed headers; signature verifies with the endpoint secret', async () => {
    findManyMock.mockResolvedValue([deliveryRow()]);
    mockFetchResponse(204);

    await dispatchPendingDeliveries();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/hook');
    expect(init?.method).toBe('POST');

    const headers = init?.headers as Record<string, string>;
    expect(headers['x-isaak-event-id']).toBe('evt_test_1');
    expect(typeof headers['x-isaak-timestamp']).toBe('string');
    expect(typeof headers['x-isaak-signature']).toBe('string');
    expect(headers['x-isaak-signature']).toHaveLength(64);
    expect(headers['content-type']).toBe('application/json');

    const body = String(init?.body);
    expect(
      verifySignature('whsec_test', headers['x-isaak-timestamp'], body, headers['x-isaak-signature'])
    ).toBe(true);
  });
});

describe('dispatchPendingDeliveries — retry path', () => {
  test('5xx on first attempt → pending + backoff (~60s) + failed counter', async () => {
    findManyMock.mockResolvedValue([deliveryRow({ attempts: 0 })]);
    mockFetchResponse(500, 'internal error');

    const summary = await dispatchPendingDeliveries();

    expect(summary).toEqual({ processed: 1, delivered: 0, failed: 1, dead: 0 });

    // Claim bumped attempts to 1
    expect(updateManyMock.mock.calls[0][0].data.attempts).toBe(1);

    const data = updateMock.mock.calls[0][0].data;
    expect(data.status).toBe('pending');
    expect(data.attempts).toBeUndefined(); // claim already did it
    expect(data.lastStatusCode).toBe(500);
    expect(data.lastError).toBe('http_500');
    expect(data.nextAttemptAt).toBeInstanceOf(Date);

    const delta = (data.nextAttemptAt as Date).getTime() - Date.now();
    // Should be ~60s in the future (with some slack for test execution).
    expect(delta).toBeGreaterThan(55_000);
    expect(delta).toBeLessThan(65_000);
  });

  test('network error → pending + lastError captured', async () => {
    findManyMock.mockResolvedValue([deliveryRow({ attempts: 1 })]);
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));

    const summary = await dispatchPendingDeliveries();

    expect(summary.failed).toBe(1);
    expect(updateManyMock.mock.calls[0][0].data.attempts).toBe(2);
    const data = updateMock.mock.calls[0][0].data;
    expect(data.status).toBe('pending');
    expect(data.lastError).toBe('socket hang up');
    expect(data.lastStatusCode).toBeNull();
  });

  test('attempts reaching MAX_ATTEMPTS → status=dead', async () => {
    findManyMock.mockResolvedValue([deliveryRow({ attempts: MAX_ATTEMPTS - 1 })]);
    mockFetchResponse(503, 'unavailable');

    const summary = await dispatchPendingDeliveries();

    expect(summary).toEqual({ processed: 1, delivered: 0, failed: 0, dead: 1 });
    // Claim brings attempts up to MAX
    expect(updateManyMock.mock.calls[0][0].data.attempts).toBe(MAX_ATTEMPTS);
    const data = updateMock.mock.calls[0][0].data;
    expect(data.status).toBe('dead');
    expect(data.nextAttemptAt).toBeNull();
  });
});

describe('dispatchPendingDeliveries — endpoint hygiene', () => {
  test('endpoint deleted (null) → mark dead atomically without firing fetch', async () => {
    findManyMock.mockResolvedValue([deliveryRow({ endpoint: null })]);

    const summary = await dispatchPendingDeliveries();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled(); // terminal claim is updateMany
    expect(summary.dead).toBe(1);
    expect(updateManyMock.mock.calls[0][0].data.status).toBe('dead');
    expect(updateManyMock.mock.calls[0][0].data.lastError).toBe('endpoint_deleted');
  });

  test('endpoint inactive → mark dead atomically without firing fetch', async () => {
    findManyMock.mockResolvedValue([
      deliveryRow({ endpoint: { url: 'https://x', secret: 's', active: false } }),
    ]);

    const summary = await dispatchPendingDeliveries();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(summary.dead).toBe(1);
    expect(updateManyMock.mock.calls[0][0].data.lastError).toBe('endpoint_inactive');
  });

  test('endpoint deleted but another dispatcher already moved row → no double-count', async () => {
    findManyMock.mockResolvedValue([deliveryRow({ endpoint: null })]);
    updateManyMock.mockResolvedValueOnce({ count: 0 }); // terminal CAS lost

    const summary = await dispatchPendingDeliveries();

    expect(summary).toEqual({ processed: 1, delivered: 0, failed: 0, dead: 0 });
  });
});
