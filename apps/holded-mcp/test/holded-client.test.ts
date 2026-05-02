import test from 'node:test';
import assert from 'node:assert/strict';
import { installTestEnv, withHoldedFetchRecorder } from './helpers.ts';

installTestEnv();

const { HoldedClient, HoldedApiError, HOLDED_DOC_TYPES } = await import('../src/holded-client.ts');
const { toUnixSecondsString, toUnixSecondsNumber } = await import('../src/utils.ts');

const fakeApiKey = 'holded-api-key-test';

test('HOLDED_DOC_TYPES matches the official Holded list 1:1', () => {
  assert.deepEqual(
    [...HOLDED_DOC_TYPES].sort(),
    [
      'invoice',
      'salesreceipt',
      'creditnote',
      'salesorder',
      'proform',
      'waybill',
      'estimate',
      'purchase',
      'purchaseorder',
      'purchaserefund',
    ].sort()
  );
});

test('every client read calls the documented Holded URL with the API key header', async () => {
  const recorder = withHoldedFetchRecorder({ responseBody: [] });
  const client = new HoldedClient(fakeApiKey);

  try {
    await client.listDocuments('invoice');
    await client.getDocument('invoice', 'doc-1');
    await client.listContacts({ page: '1' });
    await client.getContact('c-1');
    await client.listContactFunnels();
    await client.listLeads();
    await client.listLeads('funnel-1');
    await client.listProducts();
    await client.getProduct('p-1');
    await client.listProductsStock();
    await client.listWarehouses();
    await client.listTaxes();
    await client.listNumberingSeries();
    await client.listProjects();
    await client.getProject('proj-1');
    await client.listTasks('proj-1');
    await client.listTimeRecords('proj-1');
    await client.getChartOfAccounts();
    await client.getDailyLedger({ starttmp: '1700000000', endtmp: '1701000000' });
    await client.listEmployees();
    await client.getEmployee('e-1');
    await client.listTreasuryAccounts();
  } finally {
    recorder.restore();
  }

  const expected = [
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/documents/invoice' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/documents/invoice/doc-1' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/contacts?page=1' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/contacts/c-1' },
    { method: 'GET', url: 'https://api.holded.com/api/crm/v1/funnels' },
    { method: 'GET', url: 'https://api.holded.com/api/crm/v1/leads' },
    { method: 'GET', url: 'https://api.holded.com/api/crm/v1/leads?funnelId=funnel-1' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/products' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/products/p-1' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/products/stock' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/warehouses' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/taxes' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/numberingseries' },
    { method: 'GET', url: 'https://api.holded.com/api/projects/v1/projects' },
    { method: 'GET', url: 'https://api.holded.com/api/projects/v1/projects/proj-1' },
    { method: 'GET', url: 'https://api.holded.com/api/projects/v1/projects/proj-1/tasks' },
    { method: 'GET', url: 'https://api.holded.com/api/projects/v1/projects/proj-1/timerecords' },
    {
      method: 'GET',
      url: 'https://api.holded.com/api/accounting/v1/chartofaccounts?includeEmpty=1',
    },
    {
      method: 'GET',
      url: 'https://api.holded.com/api/accounting/v1/dailyledger?starttmp=1700000000&endtmp=1701000000',
    },
    { method: 'GET', url: 'https://api.holded.com/api/team/v1/employees' },
    { method: 'GET', url: 'https://api.holded.com/api/team/v1/employees/e-1' },
    { method: 'GET', url: 'https://api.holded.com/api/invoicing/v1/treasury' },
  ];

  assert.equal(recorder.calls.length, expected.length);
  for (const [i, call] of recorder.calls.entries()) {
    assert.equal(call.method, expected[i].method, `call ${i} method mismatch`);
    assert.equal(call.url, expected[i].url, `call ${i} URL mismatch`);
    assert.equal(call.headers['key'], fakeApiKey);
    assert.equal(call.headers['content-type'], 'application/json');
  }
});

test('createDocument is invoked with whatever body the caller provides (no implicit override)', async () => {
  const recorder = withHoldedFetchRecorder({ responseBody: { status: 1, id: 'doc-1' } });
  const client = new HoldedClient(fakeApiKey);

  try {
    await client.createDocument('invoice', {
      contactId: 'c-1',
      date: 1700000000,
      approveDoc: false,
      items: [{ name: 'Item', units: 1, subtotal: 10 }],
    });
  } finally {
    recorder.restore();
  }

  assert.equal(recorder.calls.length, 1);
  const [call] = recorder.calls;
  assert.equal(call.method, 'POST');
  assert.equal(call.url, 'https://api.holded.com/api/invoicing/v1/documents/invoice');
  const body = JSON.parse(call.body ?? '{}');
  assert.equal(body.approveDoc, false);
  assert.equal(body.contactId, 'c-1');
});

test('soft errors (200 OK with status:0) are converted into HoldedApiError', async () => {
  const recorder = withHoldedFetchRecorder({
    responseBody: { status: 0, info: 'invoice not allowed for this account' },
  });
  const client = new HoldedClient(fakeApiKey);

  try {
    await assert.rejects(
      () =>
        client.createDocument('invoice', {
          contactId: 'c-1',
          date: 1700000000,
          approveDoc: false,
          items: [],
        }),
      (err: unknown) =>
        err instanceof HoldedApiError &&
        /soft error/i.test(err.message) &&
        /invoice not allowed/i.test(err.message)
    );
  } finally {
    recorder.restore();
  }
});

test('getDocumentPdf returns a Buffer of bytes', async () => {
  const pdfBytes = Buffer.from('%PDF-1.4 hello world');
  const recorder = withHoldedFetchRecorder({ responseBinary: pdfBytes });
  const client = new HoldedClient(fakeApiKey);

  try {
    const buf = await client.getDocumentPdf('invoice', 'doc-42');
    assert.ok(Buffer.isBuffer(buf));
    assert.equal(buf.toString('utf8'), '%PDF-1.4 hello world');

    assert.equal(recorder.calls.length, 1);
    assert.equal(
      recorder.calls[0].url,
      'https://api.holded.com/api/invoicing/v1/documents/invoice/doc-42/pdf'
    );
  } finally {
    recorder.restore();
  }
});

test('toUnixSecondsString accepts ISO 8601 and Unix seconds', () => {
  assert.equal(toUnixSecondsString('2024-01-01T00:00:00Z'), '1704067200');
  assert.equal(toUnixSecondsString('1700000000'), '1700000000');
  assert.equal(toUnixSecondsString(1700000000), '1700000000');
  // Milisegundos se convierten a segundos.
  assert.equal(toUnixSecondsString('1700000000000'), '1700000000');
  assert.equal(toUnixSecondsNumber('2024-01-01T00:00:00Z'), 1704067200);
  assert.throws(() => toUnixSecondsString('not a date'));
});
