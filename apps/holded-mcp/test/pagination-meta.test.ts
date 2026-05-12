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
  // Pagina 1 con default pageSize=500
  const page1Entries = Array.from({ length: 500 }, (_, i) => ({
    accountId: 70500000,
    debit: 0,
    credit: 100 + i,
  }));
  const meta1 = buildPaginationMeta(page1Entries.length, 1);
  assert.equal(meta1.pageSize, 500);
  assert.equal(meta1.likelyHasMorePages, true);
  assert.equal(meta1.suggestedNextPage, 2);
  assert.match(meta1.hint as string, /fetched every page/i);

  // Pagina 2 parcial
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

test('regresion task #107: pageSize default NO debe ser 100', () => {
  // Smoke test post-deploy T#106: pagination.pageSize:100 pero itemsInPage:250
  // = discrepancia. Fix: default cambio a 500.
  const meta = buildPaginationMeta(250, 1);
  assert.equal(meta.pageSize, 500, 'pageSize default debe ser 500');
  assert.equal(meta.likelyHasMorePages, false, '250 < 500');
  assert.equal(meta.suggestedNextPage, null);
});
