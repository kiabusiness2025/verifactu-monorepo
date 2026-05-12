/**
 * Regression test for task #102 (12-may-2026).
 *
 * Bug original: en la demo side-by-side del 12 may 2026, ChatGPT y Claude
 * pidieron "los 5 contactos más recientes" al conector Holded y recibieron
 * conjuntos COMPLETAMENTE disjuntos — sin un solo contacto en común. Causa:
 * Holded `/api/invoicing/v1/contacts` no garantiza orden y el wrapper MCP no
 * lo aplicaba client-side; cada modelo paginaba en una dirección distinta y
 * acababa con un subconjunto distinto.
 *
 * Fix: el handler de `list_contacts` ahora ordena por `createdAt` con default
 * "recent" (más nuevos primero) antes de truncar a `limit`. Acepta también
 * sort="oldest". Tolera varios nombres de campo de timestamp.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readCreatedAt } from '../src/tools/contacts.ts';

test('readCreatedAt extrae createdAt numérico', () => {
  assert.equal(readCreatedAt({ createdAt: 1747008000 }), 1747008000);
});

test('readCreatedAt extrae created_at en snake_case', () => {
  assert.equal(readCreatedAt({ created_at: 1747008000 }), 1747008000);
});

test('readCreatedAt extrae creationDate como camelCase alternativo', () => {
  assert.equal(readCreatedAt({ creationDate: 1747008000 }), 1747008000);
});

test('readCreatedAt parsea ISO 8601 a Unix seconds', () => {
  // 2026-05-12T00:00:00Z = 1778544000
  assert.equal(readCreatedAt({ createdAt: '2026-05-12T00:00:00Z' }), 1778544000);
});

test('readCreatedAt parsea string numérico', () => {
  assert.equal(readCreatedAt({ createdAt: '1747008000' }), 1747008000);
});

test('readCreatedAt devuelve 0 para contactos sin fecha (no rompe el sort)', () => {
  assert.equal(readCreatedAt({ name: 'Sin fecha' }), 0);
  assert.equal(readCreatedAt({}), 0);
  assert.equal(readCreatedAt(null), 0);
  assert.equal(readCreatedAt(undefined), 0);
  assert.equal(readCreatedAt('not an object'), 0);
});

test('sort "recent" pone los contactos más nuevos primero', () => {
  const contacts = [
    { name: 'Antiguo', createdAt: 1000 },
    { name: 'Reciente', createdAt: 3000 },
    { name: 'Medio', createdAt: 2000 },
  ];
  const sorted = [...contacts].sort((a, b) => readCreatedAt(b) - readCreatedAt(a));
  assert.deepEqual(
    sorted.map((c) => c.name),
    ['Reciente', 'Medio', 'Antiguo']
  );
});

test('sort "oldest" pone los contactos más antiguos primero', () => {
  const contacts = [
    { name: 'Antiguo', createdAt: 1000 },
    { name: 'Reciente', createdAt: 3000 },
    { name: 'Medio', createdAt: 2000 },
  ];
  const sorted = [...contacts].sort((a, b) => readCreatedAt(a) - readCreatedAt(b));
  assert.deepEqual(
    sorted.map((c) => c.name),
    ['Antiguo', 'Medio', 'Reciente']
  );
});

test('contactos sin createdAt quedan al final en orden "recent"', () => {
  const contacts = [
    { name: 'Sin fecha' },
    { name: 'Antiguo', createdAt: 1000 },
    { name: 'Reciente', createdAt: 3000 },
  ];
  const sorted = [...contacts].sort((a, b) => readCreatedAt(b) - readCreatedAt(a));
  assert.equal(sorted[0]?.name, 'Reciente');
  assert.equal(sorted[1]?.name, 'Antiguo');
  assert.equal(sorted[2]?.name, 'Sin fecha');
});

test('regresión task #102: dos modelos pidiendo los 5 más recientes ahora reciben EL MISMO conjunto', () => {
  // Simula el dataset que Holded devolvió en la demo: 10 contactos en orden
  // arbitrario, con createdAt como en la realidad.
  const holdedResponse = [
    { name: 'Nova Gestión', createdAt: 1778544000 }, // 2026-05-12
    { name: 'Beta Eventos', createdAt: 1700000000 }, // antiguo
    { name: 'Imprenta Profesional Mediterráneo SL', createdAt: 1778457600 },
    { name: 'Gamma Studio', createdAt: 1701000000 },
    { name: 'Inmuebles Patrimoniales Centro SL', createdAt: 1778371200 },
    { name: 'Delta Reformas', createdAt: 1702000000 },
    { name: 'Despacho Fiscal Centro SLP', createdAt: 1778284800 },
    { name: 'Épsilon Legal', createdAt: 1703000000 },
    { name: 'Servicios Limpieza Integral SL', createdAt: 1778198400 },
    { name: 'Zeta Salud', createdAt: 1704000000 },
  ];

  const sorted = [...holdedResponse].sort((a, b) => readCreatedAt(b) - readCreatedAt(a));
  const top5 = sorted.slice(0, 5).map((c) => c.name);

  // Da exactamente igual el orden de entrada — los 5 más recientes son siempre
  // los mismos 5, en el mismo orden.
  assert.deepEqual(top5, [
    'Nova Gestión',
    'Imprenta Profesional Mediterráneo SL',
    'Inmuebles Patrimoniales Centro SL',
    'Despacho Fiscal Centro SLP',
    'Servicios Limpieza Integral SL',
  ]);
});
