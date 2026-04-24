import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startTestServer, installTestEnv } from './helpers.ts';
import {
  CREATE_INVOICE_DRAFT_ANNOTATIONS,
  PRODUCTION_TOOL_NAMES,
  READ_ONLY_TOOL_ANNOTATIONS,
  READ_ONLY_TOOL_NAMES,
} from '../src/tools/policy.ts';
import { registerProductionTools } from '../src/tools/index.ts';

installTestEnv();

test('registerProductionTools exposes exactly the intended production surface', () => {
  const captured: Array<{
    name: string;
    description?: string;
    annotations?: Record<string, unknown>;
  }> = [];

  const fakeServer = {
    tool(
      name: string,
      description: string,
      _schema: unknown,
      annotations: Record<string, unknown>
    ) {
      captured.push({ name, description, annotations });
    },
  };

  registerProductionTools(fakeServer as never, (() => ({})) as never);

  assert.deepEqual(captured.map((tool) => tool.name).sort(), [...PRODUCTION_TOOL_NAMES].sort());

  for (const tool of captured) {
    if (tool.name === 'create_invoice_draft') {
      assert.deepEqual(tool.annotations, CREATE_INVOICE_DRAFT_ANNOTATIONS);
      assert.match(tool.description ?? '', /draft invoice only/i);
      assert.match(tool.description ?? '', /does not issue, send, pay, delete, finalize/i);
      continue;
    }

    assert.deepEqual(tool.annotations, READ_ONLY_TOOL_ANNOTATIONS);
  }
});

test('MCP tools/list returns the exact intended production tools with safety annotations', async () => {
  const runtime = await startTestServer();

  try {
    const { createTokenPair } = await import('../src/auth.ts');
    const tokenPair = await createTokenPair({
      holdedApiKey: 'holded-api-key-test',
      clientId: 'test-client',
      scope: 'holded:read holded:write',
    });

    const transport = new StreamableHTTPClientTransport(new URL(`${runtime.baseUrl}/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${tokenPair.accessToken}`,
        },
      },
    });

    const client = new Client({ name: 'holded-mcp-test', version: '1.0.0' });
    await client.connect(transport);

    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name).sort();

    assert.deepEqual(names, [...PRODUCTION_TOOL_NAMES].sort());
    assert.equal(
      result.tools.some((tool) => /delete|update|send|finalize|payment|crypto/i.test(tool.name)),
      false
    );

    for (const tool of result.tools) {
      if (tool.name === 'create_invoice_draft') {
        assert.deepEqual(tool.annotations, CREATE_INVOICE_DRAFT_ANNOTATIONS);
        assert.match(tool.description ?? '', /draft invoice only/i);
        continue;
      }

      assert.ok(READ_ONLY_TOOL_NAMES.includes(tool.name as (typeof READ_ONLY_TOOL_NAMES)[number]));
      assert.deepEqual(tool.annotations, READ_ONLY_TOOL_ANNOTATIONS);
    }

    await transport.close();
  } finally {
    await runtime.close();
  }
});
