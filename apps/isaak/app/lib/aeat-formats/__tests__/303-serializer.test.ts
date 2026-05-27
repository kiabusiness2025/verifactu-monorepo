import {
  buildRenderContext303,
  filename303,
  serialize303,
  type Modelo303Context,
} from '../303/serializer';
import type { Modelo303Result } from '../../isaak-modelo-303-ledger';

function sampleResult(overrides: Partial<Modelo303Result> = {}): Modelo303Result {
  return {
    ejercicio: 2026,
    periodo: '2T',
    repercutido: [{ tipo: 21, base: 10000, cuota: 2100 }],
    soportado: [{ tipo: 21, base: 2000, cuota: 420 }],
    totalDevengado: 2100,
    totalSoportado: 420,
    resultado: 1680,
    facturas: 5,
    compras: 3,
    advertencias: [],
    ...overrides,
  };
}

const sampleCtx: Modelo303Context = {
  companyVat: 'B12345678',
  companyName: 'Empresa Demo SL',
  exonerated390: false,
  hasOperationVolume: true,
};

describe('buildRenderContext303', () => {
  it('mapea totales del Modelo303Result a casillas estándar', () => {
    const r = sampleResult();
    const ctx = buildRenderContext303(r, sampleCtx);
    expect(ctx.casilla_27).toBe(2100); // total devengado
    expect(ctx.casilla_45).toBe(420); // total deducible
    expect(ctx.casilla_46).toBe(1680); // resultado régimen general
    expect(ctx.casilla_71).toBe(1680); // resultado liquidación
  });

  it('mapea casillas por tramo IVA 21%', () => {
    const r = sampleResult({
      repercutido: [{ tipo: 21, base: 10000, cuota: 2100 }],
    });
    const ctx = buildRenderContext303(r, sampleCtx);
    expect(ctx.casilla_7).toBe(10000); // base 21%
    expect(ctx.casilla_9).toBe(2100); // cuota 21%
    expect(ctx.casilla_1).toBe(0); // 4% sin operaciones
    expect(ctx.casilla_4).toBe(0); // 10% sin operaciones
  });

  it('multitramos: 4% + 10% + 21%', () => {
    const r = sampleResult({
      repercutido: [
        { tipo: 4, base: 1000, cuota: 40 },
        { tipo: 10, base: 2000, cuota: 200 },
        { tipo: 21, base: 5000, cuota: 1050 },
      ],
      totalDevengado: 1290,
    });
    const ctx = buildRenderContext303(r, sampleCtx);
    expect(ctx.casilla_1).toBe(1000);
    expect(ctx.casilla_3).toBe(40);
    expect(ctx.casilla_4).toBe(2000);
    expect(ctx.casilla_6).toBe(200);
    expect(ctx.casilla_7).toBe(5000);
    expect(ctx.casilla_9).toBe(1050);
  });

  it('result_type=I cuando hay importe a ingresar', () => {
    const ctx = buildRenderContext303(sampleResult({ resultado: 1680 }), sampleCtx);
    expect(ctx.result_type).toBe('I');
  });

  it('result_type=C cuando hay importe a compensar/devolver', () => {
    const ctx = buildRenderContext303(sampleResult({ resultado: -500 }), sampleCtx);
    expect(ctx.result_type).toBe('C');
  });

  it('result_type=N cuando resultado es cero', () => {
    const ctx = buildRenderContext303(sampleResult({ resultado: 0 }), sampleCtx);
    expect(ctx.result_type).toBe('N');
  });

  it('NIF se pasa a uppercase y se rellena a 9 chars', () => {
    const ctx = buildRenderContext303(sampleResult(), {
      ...sampleCtx,
      companyVat: 'b12345678',
    });
    expect(ctx.company_vat).toBe('B12345678');
  });

  it('ejercicio y periodo van como strings (year y period_type)', () => {
    const ctx = buildRenderContext303(sampleResult({ ejercicio: 2025, periodo: '3T' }), sampleCtx);
    expect(ctx.year).toBe('2025');
    expect(ctx.period_type).toBe('3T');
  });
});

describe('serialize303 — output structure', () => {
  it('devuelve ok=true con buffer y text', () => {
    const out = serialize303(sampleResult(), sampleCtx);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.bytes).toBeInstanceOf(Buffer);
    expect(out.text.length).toBeGreaterThan(0);
  });

  it('el text resultante tiene longitud > 2500 chars (sub01+sub03)', () => {
    const out = serialize303(sampleResult(), sampleCtx);
    if (!out.ok) throw new Error('should serialize');
    // sub01 ~1581 + sub03 1017 = ~2600
    expect(out.text.length).toBeGreaterThan(2500);
    expect(out.text.length).toBeLessThan(2700);
  });

  it('los bytes ISO-8859-15 tienen la misma longitud que text (subset ASCII)', () => {
    const out = serialize303(sampleResult(), sampleCtx);
    if (!out.ok) throw new Error('should serialize');
    expect(out.bytes.length).toBe(out.text.length);
  });

  it('el text empieza con el header constante "<T303"', () => {
    const out = serialize303(sampleResult(), sampleCtx);
    if (!out.ok) throw new Error('should serialize');
    expect(out.text.startsWith('<T303')).toBe(true);
  });

  it('el text contiene el NIF del declarante', () => {
    const out = serialize303(sampleResult(), {
      ...sampleCtx,
      companyVat: 'B12345678',
    });
    if (!out.ok) throw new Error('should serialize');
    expect(out.text).toContain('B12345678');
  });

  it('el text contiene el ejercicio "2026"', () => {
    const out = serialize303(sampleResult({ ejercicio: 2026 }), sampleCtx);
    if (!out.ok) throw new Error('should serialize');
    expect(out.text).toContain('2026');
  });

  it('NIFs con caracteres ñ producen bytes ISO-8859-15 correctos', () => {
    const out = serialize303(sampleResult(), {
      ...sampleCtx,
      companyName: 'España SL ñ',
    });
    if (!out.ok) throw new Error('should serialize');
    // Encuentra los bytes 0xF1 (ñ en Latin-9)
    expect(out.bytes.includes(0xf1)).toBe(true);
  });
});

describe('filename303', () => {
  it('forma el nombre canónico AEAT', () => {
    expect(filename303('B12345678', 2026, '2T')).toBe('B12345678-303-2026-2T.303');
  });

  it('uppercases NIF', () => {
    expect(filename303('b12345678', 2026, '2T')).toBe('B12345678-303-2026-2T.303');
  });
});
