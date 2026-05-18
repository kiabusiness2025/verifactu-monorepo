/**
 * Regression test for task #101 (12-may-2026).
 *
 * Bug original: cuando un LLM (Claude Opus 4.7, ChatGPT dev mode) envía
 * `endtmp: null` a una tool con un schema Zod `dateInput.optional()`,
 * Zod rechaza la llamada porque `.optional()` solo permite `undefined`, no
 * `null`. El modelo recibía un error de validación, volvía a intentar
 * enviando otra vez `null`, y entraba en bucle. En la demo grabada del
 * 12 may 2026 Claude perdió 8 intentos antes de descubrir que tenía que
 * usar Unix timestamps numéricos.
 *
 * Fix: `dateInputOptional` acepta `null | undefined | string | number` y
 * los normaliza a `string | number | undefined` antes de llegar al handler.
 * Después del transform, los handlers ya pueden hacer `if (v !== undefined)`
 * sin que un null se cuele.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { dateInput, dateInputOptional } from '../src/utils.ts';

test('dateInputOptional normaliza null a undefined', () => {
  assert.equal(dateInputOptional().parse(null), undefined);
});

test('dateInputOptional acepta undefined y devuelve undefined', () => {
  assert.equal(dateInputOptional().parse(undefined), undefined);
});

test('dateInputOptional acepta string ISO 8601 y lo deja pasar tal cual', () => {
  assert.equal(dateInputOptional().parse('2026-05-12'), '2026-05-12');
});

test('dateInputOptional acepta number Unix seconds y lo deja pasar tal cual', () => {
  assert.equal(dateInputOptional().parse(1747008000), 1747008000);
});

test('dateInputOptional rechaza booleans y objetos (defensa contra inputs raros)', () => {
  assert.throws(() => dateInputOptional().parse(true));
  assert.throws(() => dateInputOptional().parse({ when: 'now' }));
});

test('dateInputOptional es factory: cada llamada devuelve una instancia distinta', () => {
  // Regresión 18-may-2026 (soporte audit `list_documents`): cuando dos campos
  // (starttmp/endtmp) compartían la MISMA instancia de schema, zod-to-json-schema
  // emitía `endtmp: { "$ref": "#/properties/starttmp" }`. La factory garantiza
  // que cada call site reciba una instancia fresca para evitar la deduplicación.
  assert.notStrictEqual(dateInputOptional(), dateInputOptional());
});

test('dateInput (required) sigue rechazando null y undefined — protege parámetros obligatorios', () => {
  assert.throws(() => dateInput.parse(null));
  assert.throws(() => dateInput.parse(undefined));
});

test('dateInput (required) sigue aceptando string y number', () => {
  assert.equal(dateInput.parse('2026-05-12'), '2026-05-12');
  assert.equal(dateInput.parse(1747008000), 1747008000);
});

test('integración: schema de get_journal con endtmp=null no rompe (regresión task #101)', () => {
  // Mismo schema que registramos en server.tool('get_journal', ...)
  const getJournalSchema = z.object({
    starttmp: dateInputOptional().describe('Start date'),
    endtmp: dateInputOptional().describe('End date'),
    page: z.string().optional().describe('Page'),
  });

  // Antes del fix esto lanzaba ZodError y el LLM caía en bucle.
  const parsed = getJournalSchema.parse({
    starttmp: '2026-01-01',
    endtmp: null,
  });

  assert.equal(parsed.starttmp, '2026-01-01');
  assert.equal(parsed.endtmp, undefined);
  assert.equal(parsed.page, undefined);
});

test('integración: ambos timestamps null se normalizan a undefined', () => {
  const getJournalSchema = z.object({
    starttmp: dateInputOptional(),
    endtmp: dateInputOptional(),
  });

  const parsed = getJournalSchema.parse({
    starttmp: null,
    endtmp: null,
  });

  assert.equal(parsed.starttmp, undefined);
  assert.equal(parsed.endtmp, undefined);
});
