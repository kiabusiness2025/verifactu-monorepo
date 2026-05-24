# Isaak Intelligence — Golden test harness

Reference set of fixtures and tests that pin Isaak's chat behaviour as it
evolves through F1 → F8 (see `docs/engineering/ISAAK_INTELLIGENCE.md`).

## Layout

```
tests/intelligence/
  fixtures/
    clarify/             # ambiguous queries → should ask
    no-clarify/          # precise queries → should answer
    no-hallucination/    # no grounding → should NOT invent
    multi-turn/          # context across turns
  helpers/
    types.ts             # GoldenFixture schema
    load-fixtures.ts     # loads .json files by category
    llm-judge.ts         # GPT-4o-mini judge (opt-in)
    run-isaak.ts         # invokes callLLM with the prod system prompt
  golden/
    clarify.test.ts
    no-hallucination.test.ts
    multi-turn.test.ts
```

## Running

Most assertions hit the real LLM and cost tokens. They're SKIPPED by
default. The wiring tests always run (they verify fixtures exist).

```bash
# CI / fast: only wiring + lib unit tests
npm test -- intelligence

# Live: actually run fixtures against the LLM
ISAAK_GOLDEN_LIVE=1 npm test -- intelligence
```

Required env for live mode: `ANTHROPIC_API_KEY` (or `ISAAK_ANTHROPIC_API_KEY`)
and `OPENAI_API_KEY` (for the judge).

## Adding fixtures

Drop a JSON file into the matching category directory. Schema in
`helpers/types.ts`. Naming convention: `NN-short-slug.json`.

The fixture is automatically picked up by the test runner — no test
file changes needed.
