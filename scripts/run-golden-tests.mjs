#!/usr/bin/env node
//
// run-golden-tests.mjs
//
// Helper para correr la suite "golden" de Isaak desde la raíz del monorepo
// con una sola línea. Setea ISAAK_GOLDEN_LIVE=1 e imprime un resumen final
// con la tasa de éxito por categoría.
//
// Uso:
//   ANTHROPIC_API_KEY=sk-ant-xxx node scripts/run-golden-tests.mjs
//
//   # Solo una categoría:
//   ANTHROPIC_API_KEY=... node scripts/run-golden-tests.mjs tool-use
//
//   # Override modelo:
//   ANTHROPIC_API_KEY=... ISAAK_GOLDEN_MODEL=claude-haiku-4-5 \
//     node scripts/run-golden-tests.mjs
//
// Coste estimado: ~$1.50 USD por suite completa. Ver
// apps/isaak/tests/intelligence/README.md para detalle.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const VALID_CATEGORIES = ['tool-use', 'clarify', 'no-hallucination', 'multi-turn', 'sub-agent'];

function usage() {
  console.log('Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/run-golden-tests.mjs [category]');
  console.log('');
  console.log(`Valid categories: ${VALID_CATEGORIES.join(', ')}`);
  console.log('Omit category to run all.');
}

function preflight() {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.ISAAK_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY_DEV;
  if (!apiKey) {
    console.error('✗ Missing ANTHROPIC_API_KEY (or ISAAK_ANTHROPIC_API_KEY / ANTHROPIC_API_KEY_DEV).');
    console.error('');
    usage();
    process.exit(2);
  }
  return apiKey;
}

const category = process.argv[2]?.trim() || '';
if (category === '-h' || category === '--help') {
  usage();
  process.exit(0);
}
if (category && !VALID_CATEGORIES.includes(category)) {
  console.error(`✗ Unknown category: "${category}".`);
  console.error('');
  usage();
  process.exit(2);
}

const apiKey = preflight();

const testPath = category
  ? `tests/intelligence/golden/${category}.test.ts`
  : 'tests/intelligence/golden/';

console.log('━'.repeat(60));
console.log(`Isaak golden tests — ${category || 'all categories'}`);
console.log(`Model: ${process.env.ISAAK_GOLDEN_MODEL || 'claude-sonnet-4-6 (default)'}`);
console.log('━'.repeat(60));
console.log('');

const args = [
  'jest',
  '--config',
  'jest.config.mjs',
  testPath,
  '--verbose',
];

const startTs = Date.now();

const child = spawn('npx', args, {
  cwd: join(ROOT, 'apps/isaak'),
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: apiKey,
    ISAAK_ANTHROPIC_API_KEY: apiKey,
    ISAAK_GOLDEN_LIVE: '1',
  },
  stdio: 'inherit',
});

child.on('exit', (code) => {
  const elapsedSec = ((Date.now() - startTs) / 1000).toFixed(1);
  console.log('');
  console.log('━'.repeat(60));
  console.log(`Done in ${elapsedSec}s · exit code ${code}`);
  if (code !== 0) {
    console.log('');
    console.log('Algunos tests fallaron. Investiga:');
    console.log('  1. Cambios recientes en system prompts o tool descriptions');
    console.log('  2. Diff vs último commit que pasaba la suite');
    console.log('  3. Si el comportamiento NUEVO es correcto, actualiza el fixture');
    console.log('');
    console.log('Ver apps/isaak/tests/intelligence/README.md');
  }
  console.log('━'.repeat(60));
  process.exit(code ?? 1);
});
