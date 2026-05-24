// Golden test: no hallucination — verifies Isaak doesn't invent client
// names, amounts, or fake fiscal facts when grounding is missing.
//
// SKIPPED unless ISAAK_GOLDEN_LIVE=1.

import { loadFixturesByCategory } from '../helpers/load-fixtures';
import { runIsaakSingleTurn } from '../helpers/run-isaak';
import { isGoldenLiveMode } from '../helpers/llm-judge';

const liveMode = isGoldenLiveMode();
const describeIf = liveMode ? describe : describe.skip;

describeIf('golden / no-hallucination', () => {
  const fixtures = loadFixturesByCategory('no-hallucination');

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

    if (fixture.expected.responseExcludes?.length) {
      for (const forbidden of fixture.expected.responseExcludes) {
        expect(lower).not.toContain(forbidden.toLowerCase());
      }
    }
  });
});

describe('golden / no-hallucination wiring', () => {
  it('finds no-hallucination fixtures', () => {
    expect(loadFixturesByCategory('no-hallucination').length).toBeGreaterThan(0);
  });
});
