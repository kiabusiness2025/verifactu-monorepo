import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { installTestEnv, startTestServer, withHoldedFetchRecorder } from './helpers.ts';

installTestEnv();

/**
 * P0-1 regression test.
 *
 * Holded emite la factura inmediatamente cuando se llama POST
 * /api/invoicing/v1/documents/invoice sin approveDoc=false. La tool MCP
 * create_invoice_draft promete a Claude que solo crea borradores. Este test
 * verifica que el cuerpo HTTP que sale realmente hacia Holded incluye
 * approveDoc=false, sin importar el input recibido.
 */
test('create_invoice_draft forces approveDoc=false in the body sent to Holded', async () => {
  const runtime = await startTestServer();
  const recorder = withHoldedFetchRecorder({ responseBody: { status: 1, id: 'doc-1' } });

  try {
    const { createTokenPair } = await import('../src/auth.ts');
    const tokenPair = await createTokenPair({
      holdedApiKey: 'holded-api-key-test',
      clientId: 'test-client',
      scope: 'holded:read holded:write',
    });

    const transport = new StreamableHTTPClientTransport(new URL(`${runtime.baseUrl}/mcp`), {
      requestInit: {
        headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      },
    });

    const client = new Client({ name: 'holded-mcp-test', version: '1.0.0' });
    await client.connect(transport);

    await client.callTool({
      name: 'create_invoice_draft',
      arguments: {
        contactId: 'contact-123',
        date: '2024-01-01T00:00:00Z',
        items: [{ name: 'Consultoría', units: 1, subtotal: 100, tax: 21 }],
      },
    });

    await transport.close();

    const createCalls = recorder.calls.filter(
      (c) => c.method === 'POST' && c.url.includes('/documents/invoice')
    );
    assert.equal(createCalls.length, 1, 'expected exactly one POST to /documents/invoice');

    const body = JSON.parse(createCalls[0].body ?? '{}');
    assert.equal(
      body.approveDoc,
      false,
      'create_invoice_draft must force approveDoc=false to keep the document in draft state'
    );
    assert.equal(body.contactId, 'contact-123');
    assert.equal(body.date, 1704067200, 'ISO 8601 should have been converted to Unix seconds');
  } finally {
    recorder.restore();
    await runtime.close();
  }
});

test('create_invoice_draft cannot be tricked into approving by passing approveDoc=true', async () => {
  const runtime = await startTestServer();
  const recorder = withHoldedFetchRecorder({ responseBody: { status: 1, id: 'doc-1' } });

  try {
    const { createTokenPair } = await import('../src/auth.ts');
    const tokenPair = await createTokenPair({
      holdedApiKey: 'holded-api-key-test',
      clientId: 'test-client',
      scope: 'holded:read holded:write',
    });

    const transport = new StreamableHTTPClientTransport(new URL(`${runtime.baseUrl}/mcp`), {
      requestInit: {
        headers: { Authorization: `Bearer ${tokenPair.accessToken}` },
      },
    });

    const mcpClient = new Client({ name: 'holded-mcp-test', version: '1.0.0' });
    await mcpClient.connect(transport);

    // Intento de bypass: pasar approveDoc=true como argumento extra. La tool
    // no expone ese campo en su schema, así que zod debería ignorarlo, pero
    // aun si llegase al body, el handler lo sobreescribe con false al final.
    await mcpClient
      .callTool({
        name: 'create_invoice_draft',
        arguments: {
          contactId: 'c-1',
          date: 1700000000,
          items: [{ name: 'X', units: 1, subtotal: 1 }],
          // @ts-expect-error campo no declarado en el schema
          approveDoc: true,
        },
      })
      .catch(() => undefined); // ignoramos errores de validación; sólo nos interesa el body

    await transport.close();

    const createCalls = recorder.calls.filter(
      (c) => c.method === 'POST' && c.url.includes('/documents/invoice')
    );

    if (createCalls.length > 0) {
      const body = JSON.parse(createCalls[0].body ?? '{}');
      assert.equal(body.approveDoc, false, 'approveDoc must always be false at the wire level');
    }
  } finally {
    recorder.restore();
    await runtime.close();
  }
});
