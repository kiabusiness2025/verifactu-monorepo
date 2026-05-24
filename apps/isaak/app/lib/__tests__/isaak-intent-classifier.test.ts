import { parseClassifierJson } from '../isaak-intent-classifier-parser';

const MODEL = 'claude-haiku-4-5-20251001';

describe('parseClassifierJson', () => {
  it('parses a well-formed clarify response', () => {
    const raw = JSON.stringify({
      ambiguous: true,
      ambiguityType: 'period',
      suggestedClarification: '¿De qué período?',
      suggestedOptions: ['Este mes', 'Este trimestre', 'Este año'],
      needsTools: false,
      relevantCategories: [],
    });
    const r = parseClassifierJson(raw, MODEL, 200);
    expect(r.ambiguous).toBe(true);
    expect(r.ambiguityType).toBe('period');
    expect(r.suggestedClarification).toBe('¿De qué período?');
    expect(r.suggestedOptions).toEqual(['Este mes', 'Este trimestre', 'Este año']);
    expect(r.needsTools).toBe(false);
    expect(r.relevantCategories).toEqual([]);
  });

  it('parses a tool-using response', () => {
    const raw = JSON.stringify({
      ambiguous: false,
      ambiguityType: 'none',
      suggestedClarification: null,
      suggestedOptions: null,
      needsTools: true,
      relevantCategories: ['holded', 'banking'],
    });
    const r = parseClassifierJson(raw, MODEL, 180);
    expect(r.ambiguous).toBe(false);
    expect(r.needsTools).toBe(true);
    expect(r.relevantCategories).toEqual(['holded', 'banking']);
  });

  it('forces needsTools=false when ambiguous=true (ambiguity wins)', () => {
    const raw = JSON.stringify({
      ambiguous: true,
      ambiguityType: 'period',
      suggestedClarification: '¿Qué período?',
      suggestedOptions: ['mes', 'año'],
      needsTools: true,
      relevantCategories: ['holded'],
    });
    const r = parseClassifierJson(raw, MODEL, 100);
    expect(r.ambiguous).toBe(true);
    expect(r.needsTools).toBe(false);
    expect(r.relevantCategories).toEqual([]);
  });

  it('drops invalid categories, dedupes', () => {
    const raw = JSON.stringify({
      ambiguous: false,
      ambiguityType: 'none',
      suggestedClarification: null,
      suggestedOptions: null,
      needsTools: true,
      relevantCategories: ['holded', 'holded', 'mystery', 'banking'],
    });
    const r = parseClassifierJson(raw, MODEL, 100);
    expect(r.relevantCategories.sort()).toEqual(['banking', 'holded']);
  });

  it('caps suggestedOptions at 4 entries', () => {
    const raw = JSON.stringify({
      ambiguous: true,
      ambiguityType: 'intent',
      suggestedClarification: '¿Cuál?',
      suggestedOptions: ['a', 'b', 'c', 'd', 'e', 'f'],
      needsTools: false,
      relevantCategories: [],
    });
    const r = parseClassifierJson(raw, MODEL, 100);
    expect(r.suggestedOptions).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns safe defaults on invalid JSON', () => {
    const r = parseClassifierJson('not json at all', MODEL, 100);
    expect(r.parseError).toBe('invalid_json');
    expect(r.needsTools).toBe(true);
    expect(r.relevantCategories.length).toBeGreaterThan(0);
  });

  it('returns safe defaults when JSON is not an object', () => {
    const r = parseClassifierJson('"hello"', MODEL, 100);
    expect(r.parseError).toBe('not_object');
  });

  it('coerces unknown ambiguityType to "none"', () => {
    const raw = JSON.stringify({
      ambiguous: true,
      ambiguityType: 'martian',
      suggestedClarification: '¿?',
      suggestedOptions: ['a'],
      needsTools: false,
      relevantCategories: [],
    });
    const r = parseClassifierJson(raw, MODEL, 100);
    expect(r.ambiguityType).toBe('none');
    expect(r.ambiguous).toBe(true); // ambiguous flag preserved
  });

  it('treats empty suggestedOptions as null', () => {
    const raw = JSON.stringify({
      ambiguous: true,
      ambiguityType: 'intent',
      suggestedClarification: '¿Qué?',
      suggestedOptions: ['  ', ''],
      needsTools: false,
      relevantCategories: [],
    });
    const r = parseClassifierJson(raw, MODEL, 100);
    expect(r.suggestedOptions).toBeNull();
  });

  it('returns ambiguous=false when flag is missing or non-boolean', () => {
    const raw = JSON.stringify({
      ambiguityType: 'period',
      needsTools: false,
      relevantCategories: [],
    });
    const r = parseClassifierJson(raw, MODEL, 100);
    expect(r.ambiguous).toBe(false);
  });
});
