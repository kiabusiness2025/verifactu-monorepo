/**
 * D1 — enqueueWebhookDelivery.
 *
 * Asserts:
 *  - Creates one delivery row per active, subscribed endpoint.
 *  - Ignores inactive endpoints and endpoints that don't subscribe to
 *    the event type (the Prisma WHERE clause does this — we verify it
 *    by checking the args the mock receives).
 *  - All rows share the same eventId (so customers can dedupe across
 *    retry attempts of the *same* logical event).
 */
const findManyMock = jest.fn();
const createMock = jest.fn();

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    isaakWebhookEndpoint: { findMany: (...args: unknown[]) => findManyMock(...args) },
    isaakWebhookDelivery: { create: (...args: unknown[]) => createMock(...args) },
  },
}));

import { enqueueWebhookDelivery, generateEventId, buildEventPayload } from '../../webhooks/enqueue';

beforeEach(() => {
  findManyMock.mockReset();
  createMock.mockReset();
  createMock.mockResolvedValue({ id: 'd_x' });
});

describe('generateEventId', () => {
  test('matches the documented format evt_<ts>_<rand8>', () => {
    const id = generateEventId();
    expect(id).toMatch(/^evt_\d+_[0-9a-f]{8}$/);
  });

  test('returns unique ids on consecutive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) ids.add(generateEventId());
    expect(ids.size).toBe(10);
  });
});

describe('buildEventPayload', () => {
  test('wraps data into the canonical envelope', () => {
    const payload = buildEventPayload('evt_1', 'invoice.issued', { invoiceId: 'inv_42' });
    expect(payload).toMatchObject({
      id: 'evt_1',
      type: 'invoice.issued',
      data: { invoiceId: 'inv_42' },
    });
    expect(typeof payload.created_at).toBe('string');
    expect(payload.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('enqueueWebhookDelivery', () => {
  test('creates one delivery per matching endpoint and shares eventId', async () => {
    findManyMock.mockResolvedValue([{ id: 'ep_1' }, { id: 'ep_2' }, { id: 'ep_3' }]);

    const result = await enqueueWebhookDelivery({
      tenantId: '00000000-0000-0000-0000-000000000001',
      eventType: 'invoice.issued',
      data: { invoiceId: 'inv_1' },
    });

    expect(result.enqueued).toBe(3);
    expect(result.eventId).toMatch(/^evt_\d+_[0-9a-f]{8}$/);
    expect(createMock).toHaveBeenCalledTimes(3);

    const eventIds = createMock.mock.calls.map((c) => c[0].data.eventId);
    expect(new Set(eventIds).size).toBe(1);
    expect(eventIds[0]).toBe(result.eventId);

    const endpointIds = createMock.mock.calls.map((c) => c[0].data.endpointId);
    expect(endpointIds.sort()).toEqual(['ep_1', 'ep_2', 'ep_3']);

    for (const call of createMock.mock.calls) {
      const row = call[0].data;
      expect(row.status).toBe('pending');
      expect(row.attempts).toBe(0);
      expect(row.payload).toMatchObject({
        id: result.eventId,
        type: 'invoice.issued',
        data: { invoiceId: 'inv_1' },
      });
    }
  });

  test('queries only active endpoints subscribed to the event type', async () => {
    findManyMock.mockResolvedValue([]);

    await enqueueWebhookDelivery({
      tenantId: 'tenant_x',
      eventType: 'invoice.issued',
      data: {},
    });

    expect(findManyMock).toHaveBeenCalledTimes(1);
    const where = findManyMock.mock.calls[0][0].where;
    expect(where).toEqual({
      tenantId: 'tenant_x',
      active: true,
      events: { has: 'invoice.issued' },
    });
  });

  test('returns enqueued=0 and creates no rows when no endpoint matches', async () => {
    findManyMock.mockResolvedValue([]);

    const result = await enqueueWebhookDelivery({
      tenantId: 'tenant_x',
      eventType: 'invoice.issued',
      data: {},
    });

    expect(result.enqueued).toBe(0);
    expect(result.eventId).toMatch(/^evt_/);
    expect(createMock).not.toHaveBeenCalled();
  });
});
