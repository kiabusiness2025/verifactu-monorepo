import {
  detectBankingIntent,
  detectFiscalIntent,
  detectGestionIntent,
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

describe('detectBankingIntent', () => {
  it('matches saldo / tesoreria / liquidez', () => {
    expect(detectBankingIntent('¿Cuál es mi saldo bancario?')).toBe(true);
    expect(detectBankingIntent('Quiero ver la tesorería')).toBe(true);
    expect(detectBankingIntent('Necesito mejorar la liquidez')).toBe(true);
  });

  it('matches cash flow / runway / forecast keywords', () => {
    expect(detectBankingIntent('Previsión de caja a 30 días')).toBe(true);
    expect(detectBankingIntent('¿Cuánto runway tengo?')).toBe(true);
    expect(detectBankingIntent('Quiero ver el flujo de caja')).toBe(true);
  });

  it('matches reconciliation', () => {
    expect(detectBankingIntent('Necesito conciliar los gastos')).toBe(true);
    expect(detectBankingIntent('Estado de la conciliación bancaria')).toBe(true);
  });

  it('rejects fiscal-only or generic queries', () => {
    expect(detectBankingIntent('¿Cuándo presento el IVA?')).toBe(false);
    expect(detectBankingIntent('Hola')).toBe(false);
  });
});

describe('detectGestionIntent', () => {
  it('matches CRM keywords (cliente, proveedor, contacto)', () => {
    expect(detectGestionIntent('Crea un cliente nuevo')).toBe(true);
    expect(detectGestionIntent('Lista mis proveedores')).toBe(true);
  });

  it('matches calendar/email keywords', () => {
    expect(detectGestionIntent('Agenda una reunión el viernes')).toBe(true);
    expect(detectGestionIntent('Envía un email a Acme')).toBe(true);
    expect(detectGestionIntent('Revisa mi bandeja de Outlook')).toBe(true);
  });

  it('matches catalog keywords (producto, servicio)', () => {
    expect(detectGestionIntent('Añade un producto al catálogo')).toBe(true);
  });

  it('rejects banking/fiscal queries', () => {
    expect(detectGestionIntent('¿Cuál es mi saldo en el banco?')).toBe(false);
    expect(detectGestionIntent('¿Cuándo presento el 303?')).toBe(false);
  });
});

describe('pickSubAgent', () => {
  it('returns null when fiscal write intent is set', () => {
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

  it('returns banking for read-intent banking queries', () => {
    expect(
      pickSubAgent({
        message: '¿Cuánto saldo tengo en el banco?',
        classifierCategories: ['banking'],
        hasWriteIntent: false,
      })
    ).toBe('banking');
  });

  it('returns null when banking query has write intent', () => {
    expect(
      pickSubAgent({
        message: 'Marca este movimiento bancario como conciliado',
        classifierCategories: ['banking'],
        hasWriteIntent: true,
      })
    ).toBeNull();
  });

  it('returns gestion for CRM read queries', () => {
    expect(
      pickSubAgent({
        message: 'Muéstrame el contacto de Acme SL',
        classifierCategories: ['holded'],
        hasWriteIntent: false,
      })
    ).toBe('gestion');
  });

  it('returns gestion EVEN with write intent (the gestion agent handles writes)', () => {
    expect(
      pickSubAgent({
        message: 'Crea una factura al cliente Acme por 500€',
        classifierCategories: ['holded'],
        hasWriteIntent: true,
      })
    ).toBe('gestion');
  });

  it('prioritises fiscal over gestion when both match', () => {
    expect(
      pickSubAgent({
        message: '¿El IVA del cliente Acme está pagado?',
        classifierCategories: ['holded'],
        hasWriteIntent: false,
      })
    ).toBe('fiscal');
  });

  it('prioritises banking over gestion when both match', () => {
    expect(
      pickSubAgent({
        message: 'Cobros bancarios pendientes del cliente Acme',
        classifierCategories: ['banking'],
        hasWriteIntent: false,
      })
    ).toBe('banking');
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

  it('listSubAgents returns all three specialists', () => {
    const agents = listSubAgents();
    const ids = agents.map((a) => a.id).sort();
    expect(ids).toEqual(['banking', 'fiscal', 'gestion']);
  });

  it('banking agent has banking tools and a lower-temperature default', () => {
    const banking = getSubAgent('banking');
    expect(banking.toolCategories).toContain('banking');
    expect(banking.systemPrompt).toContain('PSD2');
    expect(banking.systemPrompt).toContain('NO INVENTES');
    expect(banking.temperature).toBeLessThan(0.5);
  });

  it('gestion agent has the broadest tool surface', () => {
    const gestion = getSubAgent('gestion');
    expect(gestion.toolCategories).toEqual(expect.arrayContaining(['holded', 'google', 'microsoft']));
    expect(gestion.systemPrompt).toContain('confirma');
    expect(gestion.maxIterations).toBeGreaterThanOrEqual(8);
  });
});
