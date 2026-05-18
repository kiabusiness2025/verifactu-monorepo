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
  TOOL_TITLES,
} from '../src/tools/policy.ts';
import { SUBMISSION_V1_TOOLS } from '../src/tools/presets.ts';

installTestEnv();

const SUBMISSION_V1_READ_ONLY_TOOLS = SUBMISSION_V1_TOOLS.filter(
  (name) => name !== 'create_invoice_draft'
);

function expectedAnnotations(toolName: (typeof PRODUCTION_TOOL_NAMES)[number]) {
  const base =
    toolName === 'create_invoice_draft'
      ? CREATE_INVOICE_DRAFT_ANNOTATIONS
      : READ_ONLY_TOOL_ANNOTATIONS;
  return { ...base, title: TOOL_TITLES[toolName] };
}

test('registerProductionTools default (submission_v1) exposes exactly 8 tools', async () => {
  const { registerProductionTools } = await import('../src/tools/index.ts');

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

  // Default preset (no toolPreset option = submission_v1 from env var or default).
  registerProductionTools(fakeServer as never, (() => ({})) as never, undefined, {
    includeWriteTools: true,
  });

  assert.deepEqual(captured.map((tool) => tool.name).sort(), [...SUBMISSION_V1_TOOLS].sort());

  for (const tool of captured) {
    const name = tool.name as (typeof PRODUCTION_TOOL_NAMES)[number];
    assert.deepEqual(tool.annotations, expectedAnnotations(name));
    assert.equal(typeof tool.annotations?.title, 'string');
    assert.ok(((tool.annotations?.title as string) ?? '').length > 0);

    if (name === 'create_invoice_draft') {
      assert.match(tool.description ?? '', /draft/i);
      assert.match(tool.description ?? '', /approveDoc=false/);
      assert.match(tool.description ?? '', /never auto-issued/i);
    }
  }
});

test('registerProductionTools with toolPreset=full exposes the entire production catalog (24 tools)', async () => {
  // Cobertura del catálogo completo. Cuando OpenAI/Anthropic aprueben
  // submission v2 podremos cambiar el default a `full` para submission v3.
  // Hasta entonces, `full` solo se usa internamente (PATs, smoke tests).
  const { registerProductionTools } = await import('../src/tools/index.ts');
  const captured: string[] = [];
  const fakeServer = {
    tool(name: string) {
      captured.push(name);
    },
  };
  registerProductionTools(fakeServer as never, (() => ({})) as never, undefined, {
    includeWriteTools: true,
    toolPreset: 'full',
  });
  assert.deepEqual(captured.sort(), [...PRODUCTION_TOOL_NAMES].sort());
});

test('MCP tools/list returns the 8 submission_v1 tools with safety annotations', async () => {
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

    assert.deepEqual(names, [...SUBMISSION_V1_TOOLS].sort());

    // Anthropic review criteria: ninguna tool debe combinar lectura/escritura
    // ni exponer operaciones destructivas o de pago.
    assert.equal(
      result.tools.some((tool) =>
        /delete|update|send|finalize|payment|crypto|transfer|api_request/i.test(tool.name)
      ),
      false
    );

    // Anthropic review criteria: nombres ≤ 64 caracteres.
    for (const tool of result.tools) {
      assert.ok(tool.name.length <= 64, `tool name too long: ${tool.name}`);
    }

    for (const tool of result.tools) {
      const name = tool.name as (typeof PRODUCTION_TOOL_NAMES)[number];
      assert.ok(
        READ_ONLY_TOOL_NAMES.includes(tool.name as (typeof READ_ONLY_TOOL_NAMES)[number]) ||
          tool.name === 'create_invoice_draft'
      );
      assert.deepEqual(tool.annotations, expectedAnnotations(name));
    }

    await transport.close();
  } finally {
    await runtime.close();
  }
});

test('MCP tools/list hides write tools for read-only OAuth scopes (within submission_v1)', async () => {
  const runtime = await startTestServer();

  try {
    const { createTokenPair } = await import('../src/auth.ts');
    const tokenPair = await createTokenPair({
      holdedApiKey: 'holded-api-key-test',
      clientId: 'test-client',
      scope: 'holded:read',
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

    // Read-only scope → solo las 7 read tools del submission_v1, sin create_invoice_draft.
    assert.deepEqual(names, [...SUBMISSION_V1_READ_ONLY_TOOLS].sort());
    assert.equal(names.includes('create_invoice_draft'), false);

    await transport.close();
  } finally {
    await runtime.close();
  }
});
