import {
  formatFactsBlock,
  getRagPromptLimits,
  type RagFact,
} from '../isaak-rag-prompt';

function fact(overrides: Partial<RagFact> = {}): RagFact {
  return {
    fact: 'La empresa cierra el ejercicio fiscal natural y declara IVA trimestral.',
    factType: 'profile',
    similarity: 0.86,
    createdAt: new Date('2026-02-15T10:00:00Z'),
    ...overrides,
  };
}

describe('formatFactsBlock', () => {
  it('returns empty string when no facts', () => {
    expect(formatFactsBlock([])).toBe('');
  });

  it('renders a header + bullet line per fact', () => {
    const block = formatFactsBlock([fact()]);
    expect(block).toContain('Memoria larga del negocio');
    expect(block).toContain('La empresa cierra el ejercicio fiscal natural');
    expect(block).toContain('profile · 2026-02-15');
  });

  it('caps facts at maxFactsInPrompt', () => {
    const { maxFactsInPrompt } = getRagPromptLimits();
    const facts = Array.from({ length: maxFactsInPrompt + 4 }, (_, i) =>
      fact({ fact: `Hecho número ${i}`, similarity: 0.9 - i * 0.01 })
    );
    const block = formatFactsBlock(facts);
    expect((block.match(/^- /gm) ?? []).length).toBe(maxFactsInPrompt);
  });

  it('truncates a single fact above the char limit with an ellipsis', () => {
    const { maxFactChars } = getRagPromptLimits();
    const long = 'x'.repeat(maxFactChars + 50);
    const block = formatFactsBlock([fact({ fact: long })]);
    expect(block).toMatch(/x+…/);
  });

  it('handles string dates gracefully', () => {
    const block = formatFactsBlock([
      fact({ createdAt: '2026-04-01T00:00:00Z' as unknown as string }),
    ]);
    expect(block).toContain('2026-04-01');
  });

  it('handles invalid dates without crashing', () => {
    const block = formatFactsBlock([fact({ createdAt: 'not-a-date' as unknown as string })]);
    expect(block).toContain('profile');
    expect(block).not.toContain('Invalid Date');
  });

  it('puts the instruction "NO inventar" in the header', () => {
    const block = formatFactsBlock([fact()]);
    expect(block).toContain('NO inventar');
  });
});
