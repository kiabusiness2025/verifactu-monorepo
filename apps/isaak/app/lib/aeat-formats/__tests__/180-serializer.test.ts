import { serialize180, type Modelo180Context } from '../180/serializer';
import { SPEC_180_TIPO1, SPEC_180_TIPO2 } from '../180/fields';
import type { Modelo180Result } from '../../isaak-modelo-180-ledger';

const CTX: Modelo180Context = {
  companyVat: 'B12345678',
  companyName: 'Empresa Demo SL',
  telefonoContacto: '912345678',
  nombreContacto: 'JUAN GARCIA',
  numeroDeclaracion: '1802025000001',
};

function sampleResult(overrides: Partial<Modelo180Result> = {}): Modelo180Result {
  return {
    ejercicio: 2025,
    lineas: [],
    totalBase: 0,
    totalRetenciones: 0,
    perceptores: 0,
    advertencias: [],
    ...overrides,
  };
}

describe('SPEC_180_TIPO1 — invariantes', () => {
  it('suma 500 bytes', () => {
    const total = SPEC_180_TIPO1.reduce((s, f) => s + f.size, 0);
    expect(total).toBe(500);
  });
  it('arranca con tipo registro "1" y modelo "180"', () => {
    expect(SPEC_180_TIPO1[0]?.fixedValue).toBe('1');
    expect(SPEC_180_TIPO1[1]?.fixedValue).toBe('180');
  });
});

describe('SPEC_180_TIPO2 — invariantes', () => {
  it('suma 500 bytes', () => {
    const total = SPEC_180_TIPO2.reduce((s, f) => s + f.size, 0);
    expect(total).toBe(500);
  });
  it('arranca con tipo registro "2"', () => {
    expect(SPEC_180_TIPO2[0]?.fixedValue).toBe('2');
  });
});

describe('serialize180 — sin perceptores', () => {
  it('produce 500 bytes (solo registro tipo 1)', () => {
    const out = serialize180(sampleResult(), CTX);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text.length).toBe(500);
    expect(out.bytes.length).toBe(500);
  });

  it('registro tipo 1 empieza con "1180" + ejercicio + NIF', () => {
    const out = serialize180(sampleResult({ ejercicio: 2025 }), CTX);
    if (!out.ok) throw new Error('should serialize');
    expect(out.text.slice(0, 4)).toBe('1180');
    expect(out.text.slice(4, 8)).toBe('2025');
    expect(out.text.slice(8, 17)).toBe('B12345678');
  });

  it('totalPerceptores = 0 cuando no hay líneas', () => {
    const out = serialize180(sampleResult(), CTX);
    if (!out.ok) throw new Error('should serialize');
    // posición 136-144 (9 chars). Char index 135-143.
    expect(out.text.slice(135, 144)).toBe('000000000');
  });

  it('importes en céntimos (15 chars, ceros si no hay)', () => {
    const out = serialize180(sampleResult(), CTX);
    if (!out.ok) throw new Error('should serialize');
    // 145 es signo (blanco), 146-160 importe (15 chars)
    expect(out.text.slice(144, 145)).toBe(' '); // signo blanco
    expect(out.text.slice(145, 160)).toBe('000000000000000');
  });
});

describe('serialize180 — con perceptores', () => {
  it('produce 500 + 500 bytes por cada perceptor', () => {
    const out = serialize180(
      sampleResult({
        lineas: [
          {
            nif: '12345678A',
            nombre: 'Juan Pérez',
            baseAnual: 12000,
            retencionAnual: 2280,
            operaciones: 12,
          },
          {
            nif: '87654321B',
            nombre: 'María García',
            baseAnual: 6000,
            retencionAnual: 1140,
            operaciones: 6,
          },
        ],
        totalBase: 18000,
        totalRetenciones: 3420,
        perceptores: 2,
      }),
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text.length).toBe(1500); // 500 tipo 1 + 2*500 tipo 2
  });

  it('cabecera consigna totalPerceptores y totales correctamente', () => {
    const out = serialize180(
      sampleResult({
        lineas: [
          {
            nif: '12345678A',
            nombre: 'Juan',
            baseAnual: 12000,
            retencionAnual: 2280,
            operaciones: 12,
          },
        ],
        totalBase: 12000,
        totalRetenciones: 2280,
        perceptores: 1,
      }),
      CTX,
    );
    if (!out.ok) throw new Error('should serialize');
    // totalPerceptores en 136-144 (9 chars). Char index 135-143.
    expect(out.text.slice(135, 144)).toBe('000000001');
    // importe total bases: posición 146-160 = char 145-160 = 15 chars
    // 12000.00 → 1200000 céntimos → padded a 15 = "000000001200000"
    expect(out.text.slice(145, 160)).toBe('000000001200000');
    // total retenciones: 161-175 = char 160-175
    // 2280.00 → 228000 céntimos → "000000000228000"
    expect(out.text.slice(160, 175)).toBe('000000000228000');
  });

  it('registro tipo 2 empieza con "2180" + ejercicio + NIF declarante + NIF perceptor', () => {
    const out = serialize180(
      sampleResult({
        lineas: [
          {
            nif: '12345678A',
            nombre: 'Juan',
            baseAnual: 12000,
            retencionAnual: 2280,
            operaciones: 12,
          },
        ],
        totalBase: 12000,
        totalRetenciones: 2280,
        perceptores: 1,
      }),
      CTX,
    );
    if (!out.ok) throw new Error('should serialize');
    const tipo2 = out.text.slice(500);
    expect(tipo2.slice(0, 4)).toBe('2180');
    expect(tipo2.slice(4, 8)).toBe('2025');
    expect(tipo2.slice(8, 17)).toBe('B12345678');
    expect(tipo2.slice(17, 26)).toBe('12345678A');
  });

  it('porcentaje retención calculado correctamente (19% típico)', () => {
    // 12000 base, 2280 retención → 19.00%
    const out = serialize180(
      sampleResult({
        lineas: [
          {
            nif: '12345678A',
            nombre: 'Juan',
            baseAnual: 12000,
            retencionAnual: 2280,
            operaciones: 12,
          },
        ],
        totalBase: 12000,
        totalRetenciones: 2280,
        perceptores: 1,
      }),
      CTX,
    );
    if (!out.ok) throw new Error('should serialize');
    const tipo2 = out.text.slice(500);
    // % retención en posición 93-96 (4 chars): entero 93-94, decimal 95-96
    // 19.00 → "19" + "00"
    expect(tipo2.slice(92, 94)).toBe('19');
    expect(tipo2.slice(94, 96)).toBe('00');
  });

  it('nombre del perceptor normalizado a uppercase sin acentos', () => {
    const out = serialize180(
      sampleResult({
        lineas: [
          {
            nif: '12345678A',
            nombre: 'José Hernández-Pérez',
            baseAnual: 1000,
            retencionAnual: 190,
            operaciones: 1,
          },
        ],
        totalBase: 1000,
        totalRetenciones: 190,
        perceptores: 1,
      }),
      CTX,
    );
    if (!out.ok) throw new Error('should serialize');
    const tipo2 = out.text.slice(500);
    const nombre = tipo2.slice(35, 75).trim();
    expect(nombre).toBe('JOSE HERNANDEZ-PEREZ');
  });

  it('modalidad por defecto = 1 (dinerario), situación = 4 (sin ref catastral)', () => {
    const out = serialize180(
      sampleResult({
        lineas: [
          {
            nif: '12345678A',
            nombre: 'Juan',
            baseAnual: 1000,
            retencionAnual: 190,
            operaciones: 1,
          },
        ],
        totalBase: 1000,
        totalRetenciones: 190,
        perceptores: 1,
      }),
      CTX,
    );
    if (!out.ok) throw new Error('should serialize');
    const tipo2 = out.text.slice(500);
    // modalidad en posición 78 (char index 77)
    expect(tipo2.slice(77, 78)).toBe('1');
    // situacionInmueble en posición 114 (char index 113)
    expect(tipo2.slice(113, 114)).toBe('4');
  });

  it('genera numeroDeclaracion automáticamente si no se pasa', () => {
    const out = serialize180(sampleResult({ ejercicio: 2025 }), {
      companyVat: 'B12345678',
      companyName: 'X',
    });
    if (!out.ok) throw new Error('should serialize');
    // posición 108-120 (13 chars). Char 107-120.
    const num = out.text.slice(107, 120);
    expect(num).toMatch(/^1802025\d{6}$/);
  });

  it('declaración complementaria pone "C" en posición 121', () => {
    const out = serialize180(
      sampleResult(),
      { ...CTX, complementaria: true, numeroDeclaracionAnterior: '1802024999999' },
    );
    if (!out.ok) throw new Error('should serialize');
    expect(out.text.slice(120, 121)).toBe('C');
    // declaracionAnterior en 123-135 = char 122-135
    expect(out.text.slice(122, 135)).toBe('1802024999999');
  });

  it('bytes ISO-8859-15 = mismo length que text (subset ASCII)', () => {
    const out = serialize180(sampleResult(), CTX);
    if (!out.ok) throw new Error('should serialize');
    expect(out.bytes.length).toBe(out.text.length);
  });
});
