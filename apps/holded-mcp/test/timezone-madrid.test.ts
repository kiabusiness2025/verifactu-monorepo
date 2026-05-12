/**
 * Regression test for task #104 (12-may-2026).
 *
 * Bug original: la factura F0030 aparecía con fecha 12/03/2026 en Claude y
 * 11/03/2026 en ChatGPT — el mismo timestamp Unix de Holded, interpretado en
 * zonas distintas (UTC vs Europe/Madrid). Para una empresa española que
 * factura, la zona contable correcta es Europe/Madrid; las facturas emitidas
 * a partir de las 22:00-23:00 horario peninsular caen en el día siguiente
 * cuando se mira en UTC, dando off-by-one.
 *
 * Fix: el MCP server ahora enriquece los documentos con campos `*Formatted`
 * en Europe/Madrid (`dateFormatted`, `dueDateFormatted`, etc). El modelo no
 * tiene que parsear Unix; lee la fecha localizada directamente.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichDocumentDates, formatDateMadrid } from '../src/utils.ts';

test('formatDateMadrid: medianoche UTC del 12-mar-2026 se ve como 12-mar en Madrid', () => {
  // 2026-03-12T00:00:00Z = 1773273600 unix seconds.
  // En Madrid (CET = UTC+1 en marzo, antes del cambio horario) son las 01:00,
  // sigue siendo día 12.
  assert.equal(formatDateMadrid(1773273600), '2026-03-12');
});

test('formatDateMadrid: 23:00 UTC del 11-mar = 00:00 del 12-mar en Madrid (no off-by-one)', () => {
  // 2026-03-11T23:00:00Z = 1773270000 unix seconds.
  // En Madrid son las 00:00 del 12-mar (CET), debería mostrar 2026-03-12.
  assert.equal(formatDateMadrid(1773270000), '2026-03-12');
});

test('formatDateMadrid: 22:30 UTC del 11-mar = 23:30 del 11-mar en Madrid (sigue siendo 11)', () => {
  // 2026-03-11T22:30:00Z = 1773268200 unix seconds.
  // En Madrid son las 23:30 del 11-mar (CET), debería mostrar 2026-03-11.
  assert.equal(formatDateMadrid(1773268200), '2026-03-11');
});

test('formatDateMadrid: horario de verano (julio) usa CEST = UTC+2', () => {
  // 2026-07-15T22:30:00Z = 1784132100 unix seconds.
  // En Madrid son las 00:30 del 16-jul (CEST), debería mostrar 2026-07-16.
  assert.equal(formatDateMadrid(1784154600), '2026-07-16');
});

test('formatDateMadrid: acepta timestamps en string', () => {
  assert.equal(formatDateMadrid('1773273600'), '2026-03-12');
});

test('formatDateMadrid: acepta timestamps en milisegundos (auto-detección)', () => {
  // Si Holded por algún motivo manda ms (>= 1e12), lo detectamos.
  assert.equal(formatDateMadrid(1773273600000), '2026-03-12');
});

test('formatDateMadrid: rechaza inputs inválidos devolviendo null', () => {
  assert.equal(formatDateMadrid(undefined), null);
  assert.equal(formatDateMadrid(null), null);
  assert.equal(formatDateMadrid('not-a-number'), null);
  assert.equal(formatDateMadrid(0), null);
  assert.equal(formatDateMadrid(-100), null);
  assert.equal(formatDateMadrid({}), null);
});

test('enrichDocumentDates: añade dateFormatted junto a date', () => {
  const doc = { id: 'doc-1', date: 1773273600, total: 100 };
  const enriched = enrichDocumentDates(doc);
  assert.equal(enriched.date, 1773273600);
  assert.equal(enriched.dateFormatted, '2026-03-12');
  assert.equal(enriched.total, 100);
});

test('enrichDocumentDates: añade *Formatted para todos los campos conocidos', () => {
  const doc = {
    id: 'doc-1',
    date: 1773273600,
    dueDate: 1773273600 + 86400 * 30,
    createdAt: 1773273600,
    updatedAt: 1773273600 + 86400,
  };
  const enriched = enrichDocumentDates(doc);
  assert.ok(enriched.dateFormatted);
  assert.ok(enriched.dueDateFormatted);
  assert.ok(enriched.createdAtFormatted);
  assert.ok(enriched.updatedAtFormatted);
});

test('enrichDocumentDates: no añade campo si el timestamp es null o inválido', () => {
  const doc = { id: 'doc-1', date: null, dueDate: 'invalid' };
  const enriched = enrichDocumentDates(doc as Record<string, unknown>);
  assert.equal(enriched.dateFormatted, undefined);
  assert.equal(enriched.dueDateFormatted, undefined);
});

test('enrichDocumentDates: no muta el objeto original', () => {
  const doc = { id: 'doc-1', date: 1773273600 };
  const enriched = enrichDocumentDates(doc);
  assert.equal('dateFormatted' in doc, false);
  assert.equal('dateFormatted' in enriched, true);
});

test('regresión task #104: F0030 emitida a las 23:30 UTC se ve como 12-mar en Madrid (no 11-mar)', () => {
  // Reproduce el bug exacto: F0030 estaba en Holded con timestamp que en UTC
  // es 11-mar 23:30 (lo que ChatGPT mostraba como 11-mar), pero en Madrid
  // es 12-mar 00:30 (lo que Claude mostraba — correcto para empresa española).
  // 2026-03-11T23:30:00Z = 1773271800 unix seconds.
  const F0030 = {
    docNumber: 'F0030',
    contactName: 'Kappa Digital Zaragoza SL',
    date: 1773271800,
    total: 102.85,
  };
  const enriched = enrichDocumentDates(F0030);
  // El modelo ahora siempre lee dateFormatted y obtiene la fecha contable
  // española correcta sin importar su zona por defecto.
  assert.equal(enriched.dateFormatted, '2026-03-12');
});
