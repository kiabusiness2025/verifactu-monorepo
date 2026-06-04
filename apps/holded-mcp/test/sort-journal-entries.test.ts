/**
 * V3.G regression test (2026-06-01).
 *
 * Bug reportado por reviewer: Holded /dailyledger devuelve los asientos en
 * orden interno Mongo (sin garantías). El usuario veia "122-129, 280, 356,
 * 384..., 660-677, 137 al final" — imposible cuadrar contablemente.
 *
 * Fix: sort estable por date ASC + number ASC ANTES de paginar, tanto en
 * get_journal como en get_daily_book.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sortJournalEntries } from '../src/utils.ts';

test('sortJournalEntries: orden cronologico ASC (oldest first)', () => {
  const unsorted = [
    { id: 'e3', date: 1717200000, number: '280' }, // 2024-06-01
    { id: 'e5', date: 1709251200, number: '137' }, // 2024-03-01
    { id: 'e1', date: 1704067200, number: '122' }, // 2024-01-01
    { id: 'e2', date: 1704153600, number: '129' }, // 2024-01-02
    { id: 'e4', date: 1721174400, number: '677' }, // 2024-07-17
  ];
  const sorted = sortJournalEntries(unsorted);
  assert.deepEqual(
    sorted.map((e) => e.number),
    ['122', '129', '137', '280', '677']
  );
});

test('sortJournalEntries: empate de fechas rompe por number ASC', () => {
  const sameDate = 1704067200;
  const unsorted = [
    { id: 'a', date: sameDate, number: '200' },
    { id: 'b', date: sameDate, number: '50' },
    { id: 'c', date: sameDate, number: '120' },
  ];
  const sorted = sortJournalEntries(unsorted);
  assert.deepEqual(
    sorted.map((e) => e.number),
    ['50', '120', '200']
  );
});

test('sortJournalEntries: entradas sin date van al final manteniendo orden relativo', () => {
  const unsorted = [
    { id: 'a', date: 1704067200, number: '1' },
    { id: 'b', number: '2' }, // sin date
    { id: 'c', date: 1704153600, number: '3' },
    { id: 'd', number: '4' }, // sin date
  ];
  const sorted = sortJournalEntries(unsorted);
  assert.deepEqual(
    sorted.map((e) => e.id),
    ['a', 'c', 'b', 'd']
  );
});

test('sortJournalEntries: number con formato string ("A-001") usa solo digitos', () => {
  const sameDate = 1704067200;
  const unsorted = [
    { date: sameDate, number: 'A-200' },
    { date: sameDate, number: 'A-050' },
    { date: sameDate, number: 'A-120' },
  ];
  const sorted = sortJournalEntries(unsorted);
  assert.deepEqual(
    sorted.map((e) => e.number),
    ['A-050', 'A-120', 'A-200']
  );
});

test('sortJournalEntries: array vacio no rompe', () => {
  assert.deepEqual(sortJournalEntries([]), []);
});

test('sortJournalEntries: docNumber como fallback de number', () => {
  const sameDate = 1704067200;
  const unsorted = [
    { date: sameDate, docNumber: '300' },
    { date: sameDate, docNumber: '100' },
    { date: sameDate, docNumber: '200' },
  ];
  const sorted = sortJournalEntries(unsorted);
  assert.deepEqual(
    sorted.map((e) => e.docNumber),
    ['100', '200', '300']
  );
});
