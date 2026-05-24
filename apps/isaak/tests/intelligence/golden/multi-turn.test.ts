// Golden test: multi-turn memory + coherence.
//
// This is the headline F1 criterion: Isaak should not repeat questions,
// should remember facts (names, periods) across turns, and shouldn't
// contradict itself.
//
// SKIPPED unless ISAAK_GOLDEN_LIVE=1.

import { detectClarificationResponse } from '../../../app/lib/isaak-chat-metrics';
import { loadFixturesByCategory } from '../helpers/load-fixtures';
import { runIsaakMultiTurn } from '../helpers/run-isaak';
import { isGoldenLiveMode } from '../helpers/llm-judge';

const liveMode = isGoldenLiveMode();
const describeIf = liveMode ? describe : describe.skip;

describeIf('golden / multi-turn memory', () => {
  const fixtures = loadFixturesByCategory('multi-turn');

  jest.setTimeout(120_000);

  test.each(fixtures.map((f) => [f.id, f]))('%s', async (_id, fixture) => {
    if (!fixture.turns?.length) throw new Error(`Fixture ${fixture.id} missing turns`);

    const { turns } = await runIsaakMultiTurn({
      turns: fixture.turns,
      context: fixture.context,
    });

    for (const assertion of fixture.expected.turnAssertions ?? []) {
      const idx = assertion.turn - 1;
      const turn = turns[idx];
      if (!turn) throw new Error(`Fixture ${fixture.id} missing turn ${assertion.turn}`);

      const lower = turn.assistant.toLowerCase();

      if (assertion.contains?.length) {
        for (const needle of assertion.contains) {
          expect(lower).toContain(needle.toLowerCase());
        }
      }
      if (assertion.excludes?.length) {
        for (const forbidden of assertion.excludes) {
          expect(lower).not.toContain(forbidden.toLowerCase());
        }
      }
      if (typeof assertion.shouldClarify === 'boolean') {
        expect(detectClarificationResponse(turn.assistant)).toBe(assertion.shouldClarify);
      }
    }
  });
});

describe('golden / multi-turn wiring', () => {
  it('finds multi-turn fixtures', () => {
    expect(loadFixturesByCategory('multi-turn').length).toBeGreaterThan(0);
  });
});
