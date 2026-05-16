import test from 'node:test';
import assert from 'node:assert/strict';
import { installTestEnv } from './helpers.ts';

installTestEnv();

const { HoldedApiError } = await import('../src/holded-client.ts');
const {
  isHoldedNotFoundError,
  isHoldedCredentialRevokedError,
  isHoldedModuleForbiddenError,
  notFoundResponse,
  moduleForbiddenResponse,
  credentialRevokedResponse,
  withControlledErrors,
} = await import('../src/tools/errors.ts');

const FAKE_ENDPOINT = '/api/test';

test('isHoldedNotFoundError matches HoldedApiError 404 and 400 by status', () => {
  const err404 = new HoldedApiError('not found', 404, FAKE_ENDPOINT);
  const err400 = new HoldedApiError('invalid id', 400, FAKE_ENDPOINT);
  const err500 = new HoldedApiError('boom', 500, FAKE_ENDPOINT);
  const errPlain = new Error('random');

  assert.equal(isHoldedNotFoundError(err404), true);
  assert.equal(isHoldedNotFoundError(err400), true);
  assert.equal(isHoldedNotFoundError(err500), false);
  // Fallback por mensaje para errores plain con 400/404 en el texto
  assert.equal(isHoldedNotFoundError(new Error('Holded API 404 not found')), true);
  assert.equal(isHoldedNotFoundError(errPlain), false);
});

test('isHoldedCredentialRevokedError only matches 401', () => {
  assert.equal(
    isHoldedCredentialRevokedError(new HoldedApiError('unauthorized', 401, FAKE_ENDPOINT)),
    true
  );
  assert.equal(
    isHoldedCredentialRevokedError(new HoldedApiError('forbidden', 403, FAKE_ENDPOINT)),
    false
  );
  assert.equal(
    isHoldedCredentialRevokedError(new HoldedApiError('not found', 404, FAKE_ENDPOINT)),
    false
  );
  assert.equal(isHoldedCredentialRevokedError(new Error('Holded API 401')), false);
});

test('isHoldedModuleForbiddenError only matches 403', () => {
  assert.equal(
    isHoldedModuleForbiddenError(new HoldedApiError('forbidden', 403, FAKE_ENDPOINT)),
    true
  );
  assert.equal(
    isHoldedModuleForbiddenError(new HoldedApiError('unauthorized', 401, FAKE_ENDPOINT)),
    false
  );
  assert.equal(
    isHoldedModuleForbiddenError(new HoldedApiError('not found', 404, FAKE_ENDPOINT)),
    false
  );
});

test('notFoundResponse returns a controlled MCP response (isError: false)', () => {
  const res = notFoundResponse('contact', 'test-id');
  assert.equal(res.isError, false);
  assert.equal(res.content.length, 1);
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'not_found');
  assert.equal(body.entity, 'contact');
  assert.equal(body.id, 'test-id');
  assert.match(body.message, /no existe en Holded/i);
});

test('moduleForbiddenResponse returns a controlled MCP response', () => {
  const res = moduleForbiddenResponse('list_bookings');
  assert.equal(res.isError, false);
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'holded_module_forbidden');
  assert.equal(body.tool, 'list_bookings');
  assert.equal(body.status, 403);
});

test('credentialRevokedResponse returns a controlled MCP response', () => {
  const res = credentialRevokedResponse('list_documents');
  assert.equal(res.isError, false);
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'credential_revoked');
  assert.equal(body.status, 401);
});

test('withControlledErrors converts Holded 404 into not_found', async () => {
  const wrapped = withControlledErrors(
    'get_contact',
    'contact',
    (args: { contactId: string }) => args.contactId,
    async () => {
      throw new HoldedApiError('Holded API 404', 404, FAKE_ENDPOINT);
    }
  );
  const res = await wrapped({ contactId: 'inv-1' });
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'not_found');
  assert.equal(body.id, 'inv-1');
});

test('withControlledErrors converts Holded 400 (malformed id) into not_found', async () => {
  const wrapped = withControlledErrors(
    'get_project',
    'project',
    (args: { projectId: string }) => args.projectId,
    async () => {
      throw new HoldedApiError('Holded API 400 invalid ObjectId', 400, FAKE_ENDPOINT);
    }
  );
  const res = await wrapped({ projectId: 'test-invalid-id' });
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'not_found');
  assert.equal(body.entity, 'project');
  assert.equal(body.id, 'test-invalid-id');
});

test('withControlledErrors converts Holded 403 into holded_module_forbidden', async () => {
  const wrapped = withControlledErrors(
    'list_bookings',
    'booking',
    () => '',
    async () => {
      throw new HoldedApiError('Holded API 403 forbidden', 403, FAKE_ENDPOINT);
    }
  );
  const res = await wrapped({});
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'holded_module_forbidden');
});

test('withControlledErrors converts Holded 401 into credential_revoked', async () => {
  const wrapped = withControlledErrors(
    'list_documents',
    'document',
    () => '',
    async () => {
      throw new HoldedApiError('Holded API 401 unauthorized', 401, FAKE_ENDPOINT);
    }
  );
  const res = await wrapped({});
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.error, 'credential_revoked');
});

test('withControlledErrors lets unexpected errors propagate', async () => {
  const wrapped = withControlledErrors(
    'get_contact',
    'contact',
    () => '',
    async () => {
      throw new HoldedApiError('Internal Server Error', 500, FAKE_ENDPOINT);
    }
  );
  await assert.rejects(wrapped({}), /Internal Server Error/);
});

test('withControlledErrors returns the handler result on success', async () => {
  const wrapped = withControlledErrors(
    'get_contact',
    'contact',
    () => '',
    async () => ({
      content: [{ type: 'text' as const, text: '{"id":"c1"}' }],
    })
  );
  const res = await wrapped({});
  // Should not have isError set when the handler succeeds normally.
  assert.equal(res.isError, undefined);
  assert.equal(res.content[0].text, '{"id":"c1"}');
});
