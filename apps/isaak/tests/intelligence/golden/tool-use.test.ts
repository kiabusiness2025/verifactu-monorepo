// Golden test: tool selection.
//
// Asserts that Isaak picks the RIGHT tools for a given query when read-only
// integrations are connected. Doesn't execute the tools (we don't want the
// tests to hit Holded). Verifies the first-turn snapshot.
//
// SKIPPED unless ISAAK_GOLDEN_LIVE=1.

import {
  buildReadOnlyToolsForContext,
  type IsaakToolContext,
} from '../../../app/lib/isaak-tools-registry';
import { loadFixturesByCategory } from '../helpers/load-fixtures';
import { snapshotIsaakToolSelection } from '../helpers/run-isaak';
import { isGoldenLiveMode } from '../helpers/llm-judge';

const liveMode = isGoldenLiveMode();
const describeIf = liveMode ? describe : describe.skip;

function contextFor(authCtx: {
  holdedConnected?: boolean;
  bankConnected?: boolean;
}): IsaakToolContext {
  return {
    tenantId: 'test-tenant',
    userId: 'test-user',
    holdedApiKey: authCtx.holdedConnected ? 'sk-test' : null,
    holdedConnected: Boolean(authCtx.holdedConnected),
    bankConnected: Boolean(authCtx.bankConnected),
    googleConnected: false,
    microsoftConnected: false,
    sectorConnected: false,
  };
}

describeIf('golden / tool-use selection', () => {
  const fixtures = loadFixturesByCategory('tool-use');

  jest.setTimeout(45_000);

  test.each(fixtures.map((f) => [f.id, f]))('%s', async (_id, fixture) => {
    if (!fixture.query) throw new Error(`Fixture ${fixture.id} missing query`);
    const tools = buildReadOnlyToolsForContext(
      contextFor({
        holdedConnected: fixture.context?.holdedConnected,
        bankConnected: fixture.context?.bankConnected,
      })
    );
    expect(tools.length).toBeGreaterThan(0);

    const snapshot = await snapshotIsaakToolSelection({
      query: fixture.query,
      context: fixture.context,
      tools,
    });

    const calledNames = snapshot.toolUses.map((t) => t.name);
    for (const expectedTool of fixture.expected.toolsUsed ?? []) {
      expect(calledNames).toContain(expectedTool);
    }
  });
});

describe('golden / tool-use wiring', () => {
  it('finds tool-use fixtures', () => {
    expect(loadFixturesByCategory('tool-use').length).toBeGreaterThan(0);
  });

  it('all fixtures declare expected.toolsUsed', () => {
    const fixtures = loadFixturesByCategory('tool-use');
    for (const f of fixtures) {
      expect(Array.isArray(f.expected.toolsUsed) && f.expected.toolsUsed.length).toBeTruthy();
    }
  });
});
