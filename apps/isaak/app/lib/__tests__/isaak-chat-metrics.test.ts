import { detectClarificationResponse, estimateCostEur } from '../isaak-chat-metrics';

describe('detectClarificationResponse', () => {
  it('returns true for valid clarification JSON', () => {
    const response = '{"clarify": true, "question": "¿Qué período?", "options": ["mes", "trimestre"]}';
    expect(detectClarificationResponse(response)).toBe(true);
  });

  it('tolerates whitespace before braces', () => {
    const response = '   {"clarify":true,"question":"foo","options":[]}';
    expect(detectClarificationResponse(response)).toBe(true);
  });

  it('returns false for normal prose', () => {
    expect(detectClarificationResponse('Las ventas de marzo fueron 12.000 €.')).toBe(false);
  });

  it('returns false for JSON without clarify=true', () => {
    expect(detectClarificationResponse('{"reply": "hola"}')).toBe(false);
    expect(detectClarificationResponse('{"clarify": false}')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(detectClarificationResponse('')).toBe(false);
  });

  it('returns false when text starts with prose then JSON', () => {
    expect(detectClarificationResponse('Aquí tienes: {"clarify": true}')).toBe(false);
  });
});

describe('estimateCostEur', () => {
  it('returns 0 for zero tokens', () => {
    expect(estimateCostEur('claude-sonnet-4-6', 0, 0)).toBe(0);
  });

  it('uses Sonnet pricing for claude-sonnet-4-6', () => {
    // 1M input * $3 + 1M output * $15 = $18 → ~€16.56
    const cost = estimateCostEur('claude-sonnet-4-6', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18 * 0.92, 2);
  });

  it('uses Haiku pricing for claude-haiku-4-5-20251001', () => {
    // 1M input * $0.25 + 1M output * $1.25 = $1.5 → ~€1.38
    const cost = estimateCostEur('claude-haiku-4-5-20251001', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(1.5 * 0.92, 2);
  });

  it('returns a reasonable cost for a typical Sonnet message', () => {
    // ~1500 in / 400 out
    const cost = estimateCostEur('claude-sonnet-4-6', 1500, 400);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.02);
  });

  it('falls back to default pricing for unknown models', () => {
    const cost = estimateCostEur('mystery-model-xyz', 1_000_000, 1_000_000);
    expect(cost).toBeGreaterThan(0);
  });
});
