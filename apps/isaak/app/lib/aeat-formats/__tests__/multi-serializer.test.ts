// Smoke tests para los serializers de 130, 111, 115, 349, 347, 190.
// Validan que:
//   1. El spec se parsea sin errores
//   2. La serialización no lanza excepciones para datos válidos
//   3. El output incluye el NIF del declarante y el ejercicio
//   4. El output es codificable en ISO-8859-15
//
// NO valida exhaustivamente contra el portal AEAT — eso requiere
// subir el fichero al pre-pro AEAT.

import { serialize130 } from '../130/serializer';
import { serialize111 } from '../111/serializer';
import { serialize115 } from '../115/serializer';
import { serialize349 } from '../349/serializer';
import { serialize347 } from '../347/serializer';
import { serialize190 } from '../190/serializer';

const CTX = {
  companyVat: 'B12345678',
  companyName: 'Empresa Demo SL',
};

describe('serialize130 — smoke', () => {
  it('produce buffer válido para borrador positivo', () => {
    const out = serialize130(
      {
        ejercicio: 2026,
        periodo: '2T',
        ingresosAcumulados: 20000,
        gastosAcumulados: 5000,
        rendimientoNeto: 15000,
        cuotaPrevia: 3000,
        retencionesAcumuladas: 500,
        ingresosACuenta: 200,
        resultado: 2300,
        advertencias: [],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toContain('B12345678');
    expect(out.text).toContain('2026');
    expect(out.bytes.length).toBe(out.text.length);
  });
});

describe('serialize111 — smoke', () => {
  it('produce buffer válido', () => {
    const out = serialize111(
      {
        ejercicio: 2026,
        periodo: '2T',
        trabajadores: { perceptores: 2, basesRetenciones: 4000, importeRetenciones: 600 },
        profesionales: { perceptores: 1, basesRetenciones: 1000, importeRetenciones: 150 },
        totalBases: 5000,
        totalRetenciones: 750,
        resultado: 750,
        advertencias: [],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toContain('B12345678');
  });
});

describe('serialize115 — smoke', () => {
  it('produce buffer válido', () => {
    const out = serialize115(
      {
        ejercicio: 2026,
        periodo: '2T',
        arrendadores: 1,
        basesRetenciones: 3000,
        importeRetenciones: 570,
        resultado: 570,
        advertencias: [],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toContain('B12345678');
  });
});

describe('serialize349 — smoke', () => {
  it('produce buffer válido con líneas intracom', () => {
    const out = serialize349(
      {
        ejercicio: 2026,
        periodo: '2T',
        lineas: [
          {
            nifIva: 'PT123456789',
            nombre: 'Cliente PT Lda',
            clave: 'E',
            importe: 5000,
            operaciones: 3,
          },
          {
            nifIva: 'DE987654321',
            nombre: 'Proveedor DE GmbH',
            clave: 'A',
            importe: 2000,
            operaciones: 1,
          },
        ],
        totalEntregas: 5000,
        totalAdquisiciones: 2000,
        totalOperaciones: 4,
        advertencias: [],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toContain('B12345678');
    // El partner_vat tiene el prefijo país. AEAT pide DOS campos:
    // VAT prefix (PT) y NIF sin prefijo (123456789).
    expect(out.text).toMatch(/PT|123456789/);
  });

  it('produce buffer aún sin líneas (solo cabecera)', () => {
    const out = serialize349(
      {
        ejercicio: 2026,
        periodo: '2T',
        lineas: [],
        totalEntregas: 0,
        totalAdquisiciones: 0,
        totalOperaciones: 0,
        advertencias: ['no hay líneas'],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
  });
});

describe('serialize347 — smoke', () => {
  it('produce buffer válido con clientes + proveedores', () => {
    const out = serialize347(
      {
        ejercicio: 2025,
        umbral: 3005.06,
        lineasClientes: [
          {
            nif: 'B11111111',
            nombre: 'Cliente Acme SL',
            tipo: 'cliente',
            totalAnual: 8000,
            trimestres: { T1: 2000, T2: 2000, T3: 2000, T4: 2000 },
            operaciones: 4,
          },
        ],
        lineasProveedores: [
          {
            nif: 'B22222222',
            nombre: 'Proveedor SL',
            tipo: 'proveedor',
            totalAnual: 5000,
            trimestres: { T1: 1250, T2: 1250, T3: 1250, T4: 1250 },
            operaciones: 4,
          },
        ],
        totalDeclaradoClientes: 8000,
        totalDeclaradoProveedores: 5000,
        contrapartesExcluidasPorUmbral: 3,
        advertencias: [],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toContain('B11111111');
    expect(out.text).toContain('B22222222');
  });
});

describe('serialize190 — smoke', () => {
  it('produce buffer válido para resumen anual', () => {
    const out = serialize190(
      {
        ejercicio: 2025,
        lineas: [
          {
            nif: '12345678A',
            nombre: 'Empleado Uno',
            clave: 'A',
            baseAnual: 24000,
            retencionAnual: 3600,
            operaciones: 12,
          },
          {
            nif: '87654321B',
            nombre: 'Profesional X',
            clave: 'G',
            baseAnual: 4000,
            retencionAnual: 600,
            operaciones: 4,
          },
        ],
        totalBase: 28000,
        totalRetenciones: 4200,
        perceptoresTrabajadores: 1,
        perceptoresProfesionales: 1,
        advertencias: [],
      },
      CTX,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text).toContain('B12345678');
  });
});
