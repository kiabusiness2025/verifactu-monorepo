// Golden test: clarify-first behavior.
//
// SKIPPED unless ISAAK_GOLDEN_LIVE=1 — these tests hit the real LLM and
// cost tokens. Run locally with:
//   ISAAK_GOLDEN_LIVE=1 npm test -- tests/intelligence/golden/clarify
//
// Each fixture under fixtures/clarify and fixtures/no-clarify is asserted
// against the Isaak system prompt + memory architecture from F1.

import { detectClarificationResponse } from '../../../app/lib/isaak-chat-metrics';
import { loadFixturesByCategory } from '../helpers/load-fixtures';
import { runIsaakSingleTurn } from '../helpers/run-isaak';
import { isGoldenLiveMode } from '../helpers/llm-judge';

const liveMode = isGoldenLiveMode();
const describeIf = liveMode ? describe : describe.skip;

describeIf('golden / clarify-first', () => {
  const clarifyFixtures = loadFixturesByCategory('clarify');
  const noClarifyFixtures = loadFixturesByCategory('no-clarify');

  jest.setTimeout(45_000);

  describe('should clarify (ambiguous queries)', () => {
    test.each(clarifyFixtures.map((f) => [f.id, f]))(
      '%s',
      async (_id, fixture) => {
        if (!fixture.query) throw new Error(`Fixture ${fixture.id} missing query`);
        const result = await runIsaakSingleTurn({
          query: fixture.query,
          context: fixture.context,
        });
        const looksLikeClarify = detectClarificationResponse(result.text);

        expect(looksLikeClarify).toBe(true);

        if (fixture.expected.clarificationContains?.length) {
          const lower = result.text.toLowerCase();
          const matched = fixture.expected.clarificationContains.filter((needle) =>
            lower.includes(needle.toLowerCase())
          );
          expect(matched.length).toBeGreaterThan(0);
        }
      }
    );
  });

  describe('should NOT clarify (precise queries)', () => {
    test.each(noClarifyFixtures.map((f) => [f.id, f]))(
      '%s',
      async (_id, fixture) => {
        if (!fixture.query) throw new Error(`Fixture ${fixture.id} missing query`);
        const result = await runIsaakSingleTurn({
          query: fixture.query,
          context: fixture.context,
        });
        const looksLikeClarify = detectClarificationResponse(result.text);

        expect(looksLikeClarify).toBe(false);

        if (fixture.expected.responseContains?.length) {
          const lower = result.text.toLowerCase();
          const matched = fixture.expected.responseContains.filter((needle) =>
            lower.includes(needle.toLowerCase())
          );
          expect(matched.length).toBeGreaterThan(0);
        }
      }
    );
  });
});

// Always-on smoke test so the test file isn't empty in CI.
describe('golden / clarify-first wiring', () => {
  it('finds clarify and no-clarify fixtures', () => {
    expect(loadFixturesByCategory('clarify').length).toBeGreaterThan(0);
    expect(loadFixturesByCategory('no-clarify').length).toBeGreaterThan(0);
  });
});
