import { spawnSync } from 'node:child_process';

import { loadHoldedEnvConfig } from './holded-env.mjs';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const smokeOnly = args.has('--smoke-only');
const seedOnly = args.has('--seed-only');
const dryRunSeed = args.has('--dry-run-seed');

const envConfig = loadHoldedEnvConfig(root);

if (!envConfig.apiKey) {
  console.error(
    'Missing HOLDED_TEST_API_KEY or HOLDED_API_KEY. Checked process.env and apps/holded/.env.local.'
  );
  process.exit(1);
}

const steps = [];

if (!smokeOnly) {
  steps.push({
    label: dryRunSeed ? 'Seed Holded demo data (dry run)' : 'Seed Holded demo data',
    script: 'scripts/seed-holded-demo.mjs',
    env: dryRunSeed ? { DRY_RUN: '1' } : {},
  });
}

if (!seedOnly) {
  steps.push({
    label: 'Run Holded smoke validation',
    script: 'scripts/holded-full-smoke.mjs',
    env: {},
  });
}

if (steps.length === 0) {
  console.error('Nothing to run. Use either the default command, --seed-only, or --smoke-only.');
  process.exit(1);
}

console.log('Holded demo regression');
console.log(`Base URL: ${envConfig.baseUrl}`);
console.log(`API key source: ${envConfig.source}`);

for (const step of steps) {
  console.log('');
  console.log(`==> ${step.label}`);

  const result = spawnSync(process.execPath, [step.script], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      HOLDED_TEST_API_KEY: envConfig.apiKey,
      HOLDED_API_BASE_URL: envConfig.baseUrl,
      ...step.env,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('');
console.log('Holded demo regression finished successfully.');
