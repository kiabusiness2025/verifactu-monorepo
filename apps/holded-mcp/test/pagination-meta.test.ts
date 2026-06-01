/**
 * Regression test for task #103 (12-may-2026).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaginationMeta, parsePageParam } from '../src/utils.ts';

test('buildPaginationMeta: pagina NO llena no sugiere mas paginas', () => {
  const meta = buildPaginationMeta(42, 1, 100);
  assert.equal(meta.likelyHasMorePages, false);
  assert.equal(meta.suggestedNextPage, null);
  assert.equal(meta.hint, null);
  assert.equal(meta.itemsInPage, 42);
});

test('buildPaginationMeta: pagina llena sugiere siguiente pagina', () => {
  const meta = buildPaginationMeta(100, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
  assert.equal(meta.suggestedNextPage, 2);
  assert.ok(meta.hint, 'hint deberia existir');
  assert.match(meta.hint as string, /page=2/);
  assert.match(meta.hint as string, /MORE PAGES LIKELY EXIST/);
});

test('buildPaginationMeta: aviso explicito sobre agregados parciales', () => {
  const meta = buildPaginationMeta(100, 3, 100);
  assert.match(meta.hint as string, /aggregate/i);
  assert.equal(meta.suggestedNextPage, 4);
});

test('buildPaginationMeta: heuristica pagina excedida tambien dispara aviso', () => {
  const meta = buildPaginationMeta(105, 1, 100);
  assert.equal(meta.likelyHasMorePages, true);
});

test('buildPaginationMeta: pagina vacia nunca sugiere mas', () => {
  const meta = buildPaginationMeta(0, 1, 100);
  assert.equal(meta.likelyHasMorePages, false);
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

test('regresion task #103+#107: balance contable parcial', () => {
  // V3.G (2026-06-01): default pasó de 500 a 250 (cifra real de Holded
  // /dailyledger). Página llena = exactamente pageSize.
  const page1Entries = Array.from({ length: 250 }, (_, i) => ({
    accountId: 70500000,
    debit: 0,
    credit: 100 + i,
  }));
  const meta1 = buildPaginationMeta(page1Entries.length, 1);
  assert.equal(meta1.pageSize, 250);
  assert.equal(meta1.likelyHasMorePages, true);
  assert.equal(meta1.suggestedNextPage, 2);
  assert.match(meta1.hint as string, /fetched every page/i);

  // Pagina 2 parcial — el modelo debe parar.
  const page2Entries = Array.from({ length: 30 }, () => ({
    accountId: 70500000,
    debit: 0,
    credit: 50,
  }));
  const meta2 = buildPaginationMeta(page2Entries.length, 2);
  assert.equal(meta2.likelyHasMorePages, false);
  assert.equal(meta2.suggestedNextPage, null);
  assert.equal(meta2.hint, null);
});

test('V3.G: pageSize default coincide con Holded /dailyledger real (250)', () => {
  // Bug reportado por reviewer 2026-06-01: con default pageSize=500 una
  // página llena de Holded (250 entries) marcaba likelyHasMorePages:false →
  // modelo paraba paginación → datos a la mitad sin avisar (faltaban los
  // asientos de inmovilizado y cierres 2025 del segundo lote de 219 entries).
  // Fix: default 250 coincide con la realidad observada, página llena se
  // detecta como tal y se sugiere page=2.
  const meta = buildPaginationMeta(250, 1);
  assert.equal(meta.pageSize, 250, 'pageSize default debe ser 250 (no 500)');
  assert.equal(meta.likelyHasMorePages, true, '250 >= 250 → hay más páginas');
  assert.equal(meta.suggestedNextPage, 2);
  assert.match(meta.hint as string, /Call again with page=2/);
});
