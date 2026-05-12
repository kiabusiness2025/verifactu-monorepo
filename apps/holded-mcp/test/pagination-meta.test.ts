/**
 * Regression test for task #103 (12-may-2026).
 *
 * Bug original: en la demo side-by-side, ChatGPT preguntó el balance contable
 * del grupo 7 y respondió 6.221 €. Claude — sobre los mismos datos — dio
 * 10.705 €. Diferencia: Claude paginó el libro diario hasta el final, ChatGPT
 * se quedó con la primera página de Holded sin saber que faltaba contenido.
 * Para una tool contable, un agregado parcial es peor que ningún agregado.
 *
 * Fix: get_journal, get_daily_book y otras tools que pueden devolver páginas
 * llenas ahora incluyen `pagination` con un flag explícito `likelyHasMorePages`
 * + un `hint` instructivo. La heurística es conservadora: si la página viene
 * llena (itemsInPage >= pageSize), asumimos que hay más.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaginationMeta, parsePageParam } from '../src/utils.ts';

test('buildPaginationMeta: página NO llena no sugiere más páginas', () => {
  const meta = buildPaginationMeta(42, 1, 100);
  assert.equal(meta.likelyHasMorePages, false);
  assert.equal(meta.suggestedNextPage, null);
  assert.equal(meta.hint, null);
  assert.equal(meta.itemsInPage, 42);
});

test('buildPaginationMeta: página llena sugiere siguiente página', () => {
  const meta = buildPaginationMeta(100, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
  assert.equal(meta.suggestedNextPage, 2);
  assert.ok(meta.hint, 'hint debería existir');
  assert.match(meta.hint as string, /page=2/);
  assert.match(meta.hint as string, /MORE PAGES LIKELY EXIST/);
});

test('buildPaginationMeta: aviso explícito sobre agregados parciales', () => {
  const meta = buildPaginationMeta(100, 3, 100);
  assert.match(meta.hint as string, /aggregate/i);
  assert.equal(meta.suggestedNextPage, 4);
});

test('buildPaginationMeta: heurística "página excedida" también dispara aviso', () => {
  // Si Holded por algún motivo devolviera 105 items en una página
  // (cambio de configuración) seguimos detectándolo como página llena.
  const meta = buildPaginationMeta(105, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
});

test('buildPaginationMeta: página vacía nunca sugiere más', () => {
  const meta = buildPaginationMeta(0, 1, 100);
  assert.equal(meta.likelyHasMorePages, false);
  assert.equal(meta.hint, null);
});

test('parsePageParam: acepta números y string numéricos', () => {
  assert.equal(parsePageParam(1), 1);
  assert.equal(parsePageParam('1'), 1);
  assert.equal(parsePageParam('42'), 42);
  assert.equal(parsePageParam(3.7), 3);
});

test('parsePageParam: fallback a 1 para valores inválidos', () => {
  assert.equal(parsePageParam(undefined), 1);
  assert.equal(parsePageParam(null), 1);
  assert.equal(parsePageParam('abc'), 1);
  assert.equal(parsePageParam(0), 1);
  assert.equal(parsePageParam(-5), 1);
  assert.equal(parsePageParam(''), 1);
});

test('regresión task #103: balance contable parcial — modelo recibe aviso de paginación', () => {
  // Caso concreto que disparó el bug: ChatGPT pidió el diario, Holded devolvió
  // 100 entradas (página llena), ChatGPT NO supo que había una página 2 con
  // más entradas y calculó el balance con la mitad de los datos.
  //
  // Con el fix, el modelo recibe `pagination.likelyHasMorePages: true` y un
  // hint que le instruye no agregar hasta haber paginado todo.

  // Simula la respuesta de la página 1 (full):
  const page1Entries = Array.from({ length: 100 }, (_, i) => ({
    accountId: 70500000,
    debit: 0,
    credit: 100 + i,
  }));
  const meta1 = buildPaginationMeta(page1Entries.length, 1);

  assert.equal(meta1.likelyHasMorePages, true);
  assert.equal(meta1.suggestedNextPage, 2);
  assert.match(meta1.hint as string, /fetched every page/i);

  // Página 2 (final, parcial):
  const page2Entries = Array.from({ length: 30 }, () => ({
    accountId: 70500000,
    debit: 0,
    credit: 50,
  }));
  const meta2 = buildPaginationMeta(page2Entries.length, 2);

  assert.equal(meta2.likelyHasMorePages, false);
  assert.equal(meta2.suggestedNextPage, null);
  assert.equal(meta2.hint, null);

  // El modelo ahora sabe que tiene los datos completos y puede agregar.
});
