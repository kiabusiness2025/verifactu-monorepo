import { parseJudgeJson } from '../isaak-judge-parser';

const MODEL = 'gpt-4o-mini';

describe('parseJudgeJson', () => {
  it('parses an allow verdict with empty blockers', () => {
    const raw = JSON.stringify({
      verdict: 'allow',
      reasoning: 'El usuario confirmó explícitamente.',
      blockers: [],
    });
    const r = parseJudgeJson(raw, MODEL, 220);
    expect(r.verdict).toBe('allow');
    expect(r.blockers).toEqual([]);
  });

  it('parses a needs_confirmation verdict', () => {
    const raw = JSON.stringify({
      verdict: 'needs_confirmation',
      reasoning: 'No hay confirmación explícita.',
      blockers: ['no_user_confirmation'],
    });
    const r = parseJudgeJson(raw, MODEL, 180);
    expect(r.verdict).toBe('needs_confirmation');
    expect(r.blockers).toContain('no_user_confirmation');
  });

  it('parses a block verdict with multiple blockers', () => {
    const raw = JSON.stringify({
      verdict: 'block',
      reasoning: 'Faltan datos críticos.',
      blockers: ['missing_amount', 'missing_recipient'],
    });
    const r = parseJudgeJson(raw, MODEL, 200);
    expect(r.verdict).toBe('block');
    expect(r.blockers.length).toBe(2);
  });

  it('coerces unknown verdict to "block" (fail-closed)', () => {
    const raw = JSON.stringify({
      verdict: 'maybe',
      reasoning: '...',
      blockers: [],
    });
    const r = parseJudgeJson(raw, MODEL, 100);
    expect(r.verdict).toBe('block');
  });

  it('returns block on invalid JSON', () => {
    const r = parseJudgeJson('not json', MODEL, 100);
    expect(r.verdict).toBe('block');
    expect(r.parseError).toBe('invalid_json');
    expect(r.blockers).toContain('judge_unavailable');
  });

  it('returns block when JSON is not an object', () => {
    const r = parseJudgeJson('"hi"', MODEL, 100);
    expect(r.verdict).toBe('block');
    expect(r.parseError).toBe('not_object');
  });

  it('strips non-string blockers', () => {
    const raw = JSON.stringify({
      verdict: 'block',
      reasoning: 'x',
      blockers: ['missing_amount', 123, null, 'missing_concept'],
    });
    const r = parseJudgeJson(raw, MODEL, 100);
    expect(r.blockers).toEqual(['missing_amount', 'missing_concept']);
  });

  it('caps blockers at 8 entries', () => {
    const raw = JSON.stringify({
      verdict: 'block',
      reasoning: 'lots',
      blockers: Array.from({ length: 20 }, (_, i) => `b${i}`),
    });
    const r = parseJudgeJson(raw, MODEL, 100);
    expect(r.blockers.length).toBe(8);
  });

  it('handles missing reasoning gracefully', () => {
    const raw = JSON.stringify({ verdict: 'allow', blockers: [] });
    const r = parseJudgeJson(raw, MODEL, 100);
    expect(r.verdict).toBe('allow');
    expect(r.reasoning).toBe('');
  });

  it('defaults verdict to block when field is missing', () => {
    const raw = JSON.stringify({ reasoning: '...', blockers: [] });
    const r = parseJudgeJson(raw, MODEL, 100);
    expect(r.verdict).toBe('block');
  });
});
