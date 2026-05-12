/**
 * Regression test for task #106 (12-may-2026).
 *
 * Bug original: el smoke test post-deploy del fix #101 (endtmp aceptar null)
 * revelo que Holded /api/accounting/v1/dailyledger REQUIERE starttmp y endtmp
 * como mandatory en su API. El fix #101 arreglo el schema Zod, pero el
 * handler hacia la llamada SIN endtmp y Holded respondia 400:
 *   "Query params starttmp & endtmp are mandatory"
 *
 * Fix: nuevo helper defaultDailyLedgerRange() que devuelve {starttmp: '1 enero
 * del anyo en curso', endtmp: 'ahora'}. Los handlers de get_journal y
 * get_daily_book aplican esos defaults cuando el LLM no pasa los params.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDailyLedgerRange } from '../src/utils.ts';

test('defaultDailyLedgerRange devuelve siempre starttmp y endtmp como strings', () => {
  const range = defaultDailyLedgerRange();
  assert.equal(typeof range.starttmp, 'string');
  assert.equal(typeof range.endtmp, 'string');
});

test('defaultDailyLedgerRange: starttmp < endtmp (rango temporal valido)', () => {
  const range = defaultDailyLedgerRange();
  const start = Number(range.starttmp);
  const end = Number(range.endtmp);
  assert.ok(start < end, `Esperaba starttmp (${start}) < endtmp (${end})`);
});

test('defaultDailyLedgerRange: starttmp es el 1-enero del anyo en curso', () => {
  const range = defaultDailyLedgerRange();
  const start = new Date(Number(range.starttmp) * 1000);
  const now = new Date();
  assert.equal(start.getFullYear(), now.getFullYear());
  assert.equal(start.getMonth(), 0);
  assert.equal(start.getDate(), 1);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
});

test('defaultDailyLedgerRange: endtmp es ahora aprox (dentro de 1 minuto)', () => {
  const range = defaultDailyLedgerRange();
  const end = Number(range.endtmp);
  const nowSecs = Math.floor(Date.now() / 1000);
  const diff = Math.abs(end - nowSecs);
  assert.ok(diff < 60, `Esperaba endtmp dentro de 60s de ahora, diff: ${diff}s`);
});

test('regresion task #106: rango cubre todo el anyo fiscal en curso', () => {
  const range = defaultDailyLedgerRange();
  const start = Number(range.starttmp);
  const end = Number(range.endtmp);
  // El rango debe ser al menos 0s y como mucho 1 anyo (12 * 31 dias)
  const span = end - start;
  assert.ok(span >= 0);
  assert.ok(span <= 366 * 24 * 3600);
});
