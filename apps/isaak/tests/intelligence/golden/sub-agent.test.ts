// Golden tests for F8 sub-agent routing.
//
// The routing logic (pickSubAgent) is pure and runs offline — verifying that
// each fixture query gets routed to the expected specialist. Live LLM runs
// for these fixtures are SKIPPED unless ISAAK_GOLDEN_LIVE=1 (same opt-in as
// the other golden tests).

import { loadFixturesByCategory } from '../helpers/load-fixtures';
import { pickSubAgent } from '../../../app/lib/isaak-sub-agents';
import { runIsaakSingleTurn } from '../helpers/run-isaak';
import { isGoldenLiveMode } from '../helpers/llm-judge';

describe('golden / sub-agent routing (offline)', () => {
  const fixtures = loadFixturesByCategory('sub-agent');

  it('finds sub-agent fixtures', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  test.each(fixtures.map((f) => [f.id, f]))(
    '%s routes to fiscal sub-agent',
    (_id, fixture) => {
      if (!fixture.query) throw new Error(`Fixture ${fixture.id} missing query`);
      const agent = pickSubAgent({
        message: fixture.query,
        classifierCategories: ['holded'],
        hasWriteIntent: false,
      });
      expect(agent).toBe('fiscal');
    }
  );
});

const liveMode = isGoldenLiveMode();
const describeIf = liveMode ? describe : describe.skip;

describeIf('golden / sub-agent live answers', () => {
  const fixtures = loadFixturesByCategory('sub-agent');

  jest.setTimeout(45_000);

  test.each(fixtures.map((f) => [f.id, f]))('%s', async (_id, fixture) => {
    if (!fixture.query) throw new Error(`Fixture ${fixture.id} missing query`);
    const result = await runIsaakSingleTurn({
      query: fixture.query,
      context: fixture.context,
    });
    const lower = result.text.toLowerCase();
    if (fixture.expected.responseContains?.length) {
      const matched = fixture.expected.responseContains.filter((needle) =>
        lower.includes(needle.toLowerCase())
      );
      expect(matched.length).toBeGreaterThan(0);
    }
  });
});
