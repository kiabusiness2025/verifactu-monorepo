/**
 * Regression tests para buildPaginationMeta.
 *
 * Historia:
 *   - V3.G (1ª iteración): default pageSize cambió de 500 → 250.
 *   - V3.G.1 (2ª iteración, 2026-06-01): heurística pasó de
 *     `itemsInPage >= pageSize` a `itemsInPage > 0` tras reportar el reviewer
 *     que Holded /dailyledger devolvía 155 entries en pagina 1 (menos que
 *     pageSize=250) pero la pagina 2 traía 219 más. Como Holded no garantiza
 *     que páginas no llenas sean las últimas, ahora siempre sugerimos
 *     page+1 hasta recibir array vacío. Coste: 1 llamada extra al final.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaginationMeta, parsePageParam } from '../src/utils.ts';

test('V3.G.1: cualquier página no vacía sugiere comprobar página siguiente', () => {
  // Holded no garantiza páginas llenas — el reviewer observó 155 entries
  // en page 1 con 219 más en page 2. Probar siempre hasta vacío es la
  // única estrategia robusta.
  const meta = buildPaginationMeta(42, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
  assert.equal(meta.suggestedNextPage, 2);
  assert.ok(meta.hint, 'hint debería existir si hay items');
});

test('V3.G.1: página llena sigue sugiriendo siguiente (sin cambio respecto a V3.G)', () => {
  const meta = buildPaginationMeta(100, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
  assert.equal(meta.suggestedNextPage, 2);
  assert.match(meta.hint as string, /page=2/);
});

test('V3.G.1: hint avisa sobre agregados parciales aunque sea page > 1', () => {
  const meta = buildPaginationMeta(100, 3, 100);
  assert.match(meta.hint as string, /aggregate/i);
  assert.equal(meta.suggestedNextPage, 4);
});

test('V3.G.1: cualquier cantidad > 0 sugiere paginar (incluso 1 sola entry)', () => {
  // Antes (V3.G): 1 entry < pageSize → likelyHasMorePages: false.
  // Ahora: 1 entry > 0 → flag true. El modelo hace una llamada extra y
  // recibe array vacío en page 2 si era la última. Cero falsos negativos.
  const meta = buildPaginationMeta(1, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
});

test('V3.G.1: página vacía nunca sugiere más (terminator inequívoco)', () => {
  const meta = buildPaginationMeta(0, 1, 100);
  assert.equal(meta.likelyHasMorePages, false);
  assert.equal(meta.suggestedNextPage, null);
  assert.equal(meta.hint, null);
});

test('parsePageParam: acepta numeros y string numericos', () => {
  assert.equal(parsePageParam(1), 1);
  assert.equal(parsePageParam('1'), 1);
  assert.equal(parsePageParam('42'), 42);
  assert.equal(parsePageParam(3.7), 3);
});

test('parsePageParam: fallback a 1 para valores invalidos', () => {
  assert.equal(parsePageParam(undefined), 1);
  assert.equal(parsePageParam(null), 1);
  assert.equal(parsePageParam('abc'), 1);
  assert.equal(parsePageParam(0), 1);
  assert.equal(parsePageParam(-5), 1);
  assert.equal(parsePageParam(''), 1);
});

test('V3.G.1: pageSize por defecto sigue siendo 250 (info diagnóstica al cliente)', () => {
  // pageSize ya NO se usa para decidir likelyHasMorePages — es metadata
  // informativa de "cuántas entries esperar por página". El default 250
  // refleja lo que Holded suele devolver en /dailyledger.
  const meta = buildPaginationMeta(50, 1);
  assert.equal(meta.pageSize, 250);
  // 50 entries > 0 → flag true regardless of pageSize
  assert.equal(meta.likelyHasMorePages, true);
});

test('V3.G.1: caso real reviewer (155 entries en page 1, hay más en page 2)', () => {
  // Reproduce el escenario exacto reportado por el reviewer 2026-06-01:
  // Holded /dailyledger devolvió 155 entries en page 1, pero page 2
  // tenía 219 más. Con la heurística antigua (155 < 250 → false) el
  // modelo paraba. Con V3.G.1 (155 > 0 → true) el modelo continúa.
  const page1 = buildPaginationMeta(155, 1);
  assert.equal(page1.likelyHasMorePages, true);
  assert.equal(page1.suggestedNextPage, 2);

  const page2 = buildPaginationMeta(219, 2);
  assert.equal(page2.likelyHasMorePages, true);
  assert.equal(page2.suggestedNextPage, 3);

  // Page 3 vacía → terminator
  const page3 = buildPaginationMeta(0, 3);
  assert.equal(page3.likelyHasMorePages, false);
  assert.equal(page3.suggestedNextPage, null);
});
