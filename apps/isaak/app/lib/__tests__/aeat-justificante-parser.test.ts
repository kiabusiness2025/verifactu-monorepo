import {
  extractPeriod,
  isJustificanteTitle,
  parseJustificanteTitle,
} from '../aeat-justificante-parser';

describe('isJustificanteTitle', () => {
  it('detects standard AEAT phrasing', () => {
    expect(isJustificanteTitle('Justificante de presentación modelo 303 - 2T 2026')).toBe(true);
    expect(isJustificanteTitle('JUSTIFICANTE PRESENTACION 130 1T/2026')).toBe(true);
    expect(isJustificanteTitle('Notificación de aceptación del modelo 111 ejercicio 2026 periodo 2T')).toBe(true);
    expect(isJustificanteTitle('Confirmación de presentación modelo 303')).toBe(true);
    expect(isJustificanteTitle('Aceptado modelo 200 ejercicio 2025')).toBe(true);
  });

  it('does not match unrelated titles', () => {
    expect(isJustificanteTitle('Requerimiento de información IVA Q1 2026')).toBe(false);
    expect(isJustificanteTitle('Comunicación informativa')).toBe(false);
    expect(isJustificanteTitle('Diligencia de embargo')).toBe(false);
    expect(isJustificanteTitle('')).toBe(false);
  });
});

describe('extractPeriod', () => {
  it('parses quarterly periods in multiple AEAT formats', () => {
    expect(extractPeriod('Justificante modelo 303 - 1T 2026')).toBe('Q1-2026');
    expect(extractPeriod('Modelo 130 2T/2026')).toBe('Q2-2026');
    expect(extractPeriod('Justificante 111 T3 2026')).toBe('Q3-2026');
    expect(extractPeriod('modelo 115 ejercicio 2026 periodo 4T')).toBe('Q4-2026');
  });

  it('parses monthly periods (SII)', () => {
    expect(extractPeriod('Justificante modelo 303 03/2026')).toBe('M03-2026');
    expect(extractPeriod('Justificante modelo 303 marzo 2026')).toBe('M03-2026');
    expect(extractPeriod('Modelo 303 enero 2026')).toBe('M01-2026');
    expect(extractPeriod('Modelo 303 diciembre 2025')).toBe('M12-2025');
  });

  it('parses annual periods', () => {
    expect(extractPeriod('Justificante modelo 390 ejercicio 2025')).toBe('A-2025');
    expect(extractPeriod('Modelo 200 anual 2026')).toBe('A-2026');
    expect(extractPeriod('Resumen anual 347 2025')).toBe('A-2025');
  });

  it('returns null when no year is present', () => {
    expect(extractPeriod('Justificante modelo 303 1T')).toBeNull();
    expect(extractPeriod('Modelo 130')).toBeNull();
  });

  it('handles accented Spanish month names', () => {
    // "marzo" no lleva tilde pero el normalizador trata ambos casos
    expect(extractPeriod('Modelo 303 Marzo 2026')).toBe('M03-2026');
  });
});

describe('parseJustificanteTitle', () => {
  it('returns the structured match for a typical title', () => {
    const r = parseJustificanteTitle('Justificante de presentación modelo 303 - 2T 2026');
    expect(r).not.toBeNull();
    expect(r?.model).toBe('303');
    expect(r?.period).toBe('Q2-2026');
    expect(r?.confidence).toBe('high');
  });

  it('returns null when title is not a justificante', () => {
    expect(parseJustificanteTitle('Requerimiento información IVA Q2 2026')).toBeNull();
  });

  it('returns null when model is not recognized', () => {
    expect(parseJustificanteTitle('Justificante modelo 999 1T 2026')).toBeNull();
  });

  it('returns null when period cannot be derived', () => {
    expect(parseJustificanteTitle('Justificante modelo 303')).toBeNull();
  });

  it('lowers confidence when model number lacks "modelo" prefix', () => {
    // El número 303 aparece pero sin la palabra "modelo" delante
    const r = parseJustificanteTitle('Justificante presentación 303 - 1T 2026');
    expect(r).not.toBeNull();
    expect(['medium', 'low']).toContain(r?.confidence);
  });

  it('parses confirmación + ejercicio anual', () => {
    const r = parseJustificanteTitle('Confirmación presentación modelo 390 ejercicio 2025');
    expect(r?.model).toBe('390');
    expect(r?.period).toBe('A-2025');
  });
});
