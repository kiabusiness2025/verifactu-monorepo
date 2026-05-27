import {
  buildInspectorQueryFromViolation,
  type ViolationLike,
} from '../inspector-query-builder';

function v(overrides: Partial<ViolationLike> = {}): ViolationLike {
  return {
    ruleId: 'R001',
    message: 'Falta NIF en factura',
    ...overrides,
  };
}

describe('buildInspectorQueryFromViolation', () => {
  it('incluye ruleId, message y la pregunta cerrada', () => {
    const q = buildInspectorQueryFromViolation(v());
    expect(q).toContain('R001');
    expect(q).toContain('Falta NIF en factura');
    expect(q).toContain('¿qué dice la normativa AEAT/BOE');
  });

  it('omite recommendation cuando no existe', () => {
    const q = buildInspectorQueryFromViolation(v({ recommendation: null }));
    expect(q).not.toContain('Recomendación dada');
  });

  it('incluye recommendation cuando existe', () => {
    const q = buildInspectorQueryFromViolation(
      v({ recommendation: 'Solicitar NIF al cliente antes de emitir' }),
    );
    expect(q).toContain('Recomendación dada: Solicitar NIF');
  });

  it('omite legalBasis cuando lista vacía o null', () => {
    expect(buildInspectorQueryFromViolation(v({ legalBasis: [] }))).not.toContain('Refs declaradas');
    expect(buildInspectorQueryFromViolation(v({ legalBasis: null }))).not.toContain('Refs declaradas');
  });

  it('incluye legalBasis concatenado con coma', () => {
    const q = buildInspectorQueryFromViolation(
      v({
        legalBasis: [
          { article: 'Art. 6.1', law: 'RD 1619/2012' },
          { article: 'Art. 88', law: 'LIVA' },
        ],
      }),
    );
    expect(q).toContain('Refs declaradas: Art. 6.1 RD 1619/2012, Art. 88 LIVA');
  });

  it('todas las partes están separadas por un espacio (no newlines)', () => {
    const q = buildInspectorQueryFromViolation(
      v({
        recommendation: 'X',
        legalBasis: [{ article: 'A', law: 'L' }],
      }),
    );
    // Debe ser un único bloque ' ' delimitado para que el LLM lo procese
    // como una sola pregunta semántica, no como bullets sueltos.
    expect(q.split('\n').length).toBe(1);
  });

  it('query mínima (solo ruleId + message + pregunta) tiene > 50 chars', () => {
    const q = buildInspectorQueryFromViolation(v());
    expect(q.length).toBeGreaterThan(50);
  });
});
