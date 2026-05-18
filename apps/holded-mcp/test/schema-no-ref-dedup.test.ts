/**
 * Regresión 18-may-2026 (soporte audit `list_documents`).
 *
 * Bug original: `starttmp` y `endtmp` (y `dueDate` en otras tools) usaban la
 * MISMA instancia singleton `dateInputOptional`. Con Zod v3 (que es lo que
 * resuelve en el contenedor de Railway donde corre apps/holded-mcp aislado),
 * la librería `zod-to-json-schema` deduplica schemas que referencian la misma
 * instancia y emite un `$ref`:
 *
 *   {
 *     "starttmp": { "anyOf": [...], "description": "Start date" },
 *     "endtmp":   { "$ref": "#/properties/starttmp", "description": "End date" }
 *   }
 *
 * En la mayoría de clientes MCP el $ref se resuelve sin problema. Pero la UI
 * de ChatGPT — y posiblemente otros wrappers — renderiza ambos campos como
 * un único input editable, impidiendo al usuario sobrescribir `endtmp` por
 * separado. El reporte de soporte fue literalmente "no me deja sobrescribir
 * endtmp; el esquema lo fuerza vía $ref a starttmp".
 *
 * Fix: convertir `dateInputOptional` en una factory. Cada call site recibe
 * una instancia fresca → zero deduplicación → ambos campos quedan inlined.
 *
 * Por qué este test usa `zod/v3` explícito en vez de importar
 * `dateInputOptional` de `src/utils.ts`:
 *   En el monorepo hay un `zod@4.x` hoisted en el root que `utils.ts` resuelve
 *   por defecto. Pero el deploy real de apps/holded-mcp en Railway corre con
 *   el `zod: ^3.22.4` declarado en su package.json local. Para reproducir el
 *   escenario de prod (donde el bug ocurre) hay que usar zod v3 explícitamente.
 *   La cobertura de que `dateInputOptional` SÍ es una factory está en
 *   `date-input-null.test.ts` (`assert.notStrictEqual(dateInputOptional(), dateInputOptional())`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as z3 from 'zod/v3';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Réplica exacta del patrón de utils.ts pero forzando z3 (lo que ejecuta prod).
function dateInputOptionalV3() {
  return z3
    .union([z3.string(), z3.number()])
    .nullish()
    .transform((v) => (v == null ? undefined : v));
}

test('regresión: factory pattern NO produce $ref deduplication entre starttmp y endtmp (zod v3 + zod-to-json-schema)', () => {
  const schema = z3.object({
    starttmp: dateInputOptionalV3().describe('Start date — ISO 8601 or Unix seconds'),
    endtmp: dateInputOptionalV3().describe('End date — ISO 8601 or Unix seconds'),
  });

  const jsonSchema = zodToJsonSchema(schema, { strictUnions: true }) as Record<string, unknown>;
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

  // Sanity: ambas propiedades existen en el output
  assert.ok(properties.starttmp, 'starttmp should be present');
  assert.ok(properties.endtmp, 'endtmp should be present');

  // El bug crítico: ninguna propiedad debe ser un $ref a la otra
  assert.equal(
    properties.endtmp.$ref,
    undefined,
    `endtmp must be inlined, not a $ref. Got: ${JSON.stringify(properties.endtmp)}`
  );
  assert.equal(properties.starttmp.$ref, undefined, 'starttmp must be inlined too');

  // Cada propiedad debe tener su propia description (visible al modelo)
  assert.match(properties.starttmp.description as string, /Start date/);
  assert.match(properties.endtmp.description as string, /End date/);

  // Cada propiedad debe declarar su propio tipo (anyOf union, no ref opaco)
  assert.ok(properties.starttmp.anyOf, 'starttmp should have its own anyOf inlined');
  assert.ok(properties.endtmp.anyOf, 'endtmp should have its own anyOf inlined');
});

test('control: una constante singleton compartida SÍ produce $ref (documenta el bug original)', () => {
  // Este test documenta el comportamiento que provocaba el bug, para evitar
  // que alguien regrese el código a una constante singleton "porque es más
  // limpio". Si este test FALLA en el futuro (no se produce $ref), significa
  // que zod-to-json-schema cambió su estrategia y entonces la factory ya no
  // es estrictamente necesaria — pero seguir manteniéndola es defensivo.
  const sharedSingleton = z3
    .union([z3.string(), z3.number()])
    .nullish()
    .transform((v) => (v == null ? undefined : v));

  const schema = z3.object({
    starttmp: sharedSingleton.describe('Start'),
    endtmp: sharedSingleton.describe('End'),
  });

  const jsonSchema = zodToJsonSchema(schema, { strictUnions: true }) as Record<string, unknown>;
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

  assert.equal(
    properties.endtmp.$ref,
    '#/properties/starttmp',
    'CONTROL: shared singleton instances DO produce $ref dedup in zod-to-json-schema (this is the bug we fixed)'
  );
});
