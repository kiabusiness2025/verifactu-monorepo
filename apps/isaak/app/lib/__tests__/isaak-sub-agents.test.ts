import {
  detectFiscalIntent,
  getSubAgent,
  listSubAgents,
  pickSubAgent,
} from '../isaak-sub-agents';

describe('detectFiscalIntent', () => {
  it('matches direct fiscal model references', () => {
    expect(detectFiscalIntent('¿Cómo está mi modelo 303 del Q1?')).toBe(true);
    expect(detectFiscalIntent('Tengo que presentar el 130')).toBe(false); // bare digit not enough
    expect(detectFiscalIntent('Tengo que presentar el modelo 130')).toBe(true);
  });

  it('matches tax names with and without accents', () => {
    expect(detectFiscalIntent('Una pregunta sobre IVA')).toBe(true);
    expect(detectFiscalIntent('Calcula mi IRPF')).toBe(true);
    expect(detectFiscalIntent('Cuanto sale la retencion')).toBe(true);
    expect(detectFiscalIntent('Cuánto sale la retención')).toBe(true);
  });

  it('matches AEAT / Verifactu / SII keywords', () => {
    expect(detectFiscalIntent('Estado en AEAT de mi última factura')).toBe(true);
    expect(detectFiscalIntent('¿Verifactu está activo?')).toBe(true);
    expect(detectFiscalIntent('Quiero enviarlo al SII')).toBe(true);
  });

  it('rejects non-fiscal queries', () => {
    expect(detectFiscalIntent('Hola')).toBe(false);
    expect(detectFiscalIntent('¿Cuánto tengo en el banco?')).toBe(false);
    expect(detectFiscalIntent('Lista de clientes')).toBe(false);
    expect(detectFiscalIntent('¿Cuándo es la siguiente reunión?')).toBe(false);
  });

  it('matches regime keywords', () => {
    expect(detectFiscalIntent('Estoy en recargo de equivalencia, ¿qué hago?')).toBe(true);
    expect(detectFiscalIntent('Quiero pasar a criterio de caja')).toBe(true);
    expect(detectFiscalIntent('Soy autónomo')).toBe(true);
  });
});

describe('pickSubAgent', () => {
  it('returns null when write intent is set (writes stay on the orchestrator)', () => {
    const result = pickSubAgent({
      message: '¿Cómo está el modelo 303?',
      classifierCategories: ['holded'],
      hasWriteIntent: true,
    });
    expect(result).toBeNull();
  });

  it('returns fiscal for read-intent fiscal queries', () => {
    expect(
      pickSubAgent({
        message: '¿Cuánto IVA debo pagar este trimestre?',
        classifierCategories: ['holded'],
        hasWriteIntent: false,
      })
    ).toBe('fiscal');
  });

  it('returns null for non-fiscal reads', () => {
    expect(
      pickSubAgent({
        message: '¿Cuánto dinero tengo en el banco?',
        classifierCategories: ['banking'],
        hasWriteIntent: false,
      })
    ).toBeNull();
  });

  it('returns null for greetings and conceptual chit-chat', () => {
    expect(
      pickSubAgent({
        message: 'Hola, ¿qué tal?',
        classifierCategories: [],
        hasWriteIntent: false,
      })
    ).toBeNull();
  });
});

describe('SubAgent registry', () => {
  it('exposes the fiscal agent with required fields', () => {
    const fiscal = getSubAgent('fiscal');
    expect(fiscal.id).toBe('fiscal');
    expect(fiscal.systemPrompt.length).toBeGreaterThan(500);
    expect(fiscal.toolCategories).toContain('holded');
    expect(fiscal.maxIterations).toBeGreaterThan(0);
    expect(fiscal.temperature).toBeLessThan(0.5);
  });

  it('fiscal prompt mentions key Spanish tax models', () => {
    const fiscal = getSubAgent('fiscal');
    expect(fiscal.systemPrompt).toContain('303');
    expect(fiscal.systemPrompt).toContain('130');
    expect(fiscal.systemPrompt).toContain('IVA');
    expect(fiscal.systemPrompt).toContain('AEAT');
  });

  it('fiscal prompt explicitly forbids fabrication', () => {
    const fiscal = getSubAgent('fiscal');
    expect(fiscal.systemPrompt).toContain('NO INVENTES');
  });

  it('listSubAgents returns at least the fiscal agent', () => {
    const agents = listSubAgents();
    expect(agents.length).toBeGreaterThanOrEqual(1);
    expect(agents.find((a) => a.id === 'fiscal')).toBeTruthy();
  });
});
