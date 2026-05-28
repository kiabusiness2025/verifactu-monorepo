#!/usr/bin/env tsx
// CLI entry point for the AEAT browser submission worker.
//
// Usage:
//   AEAT_ENVIRONMENT=pre CERT_MASTER_KEY=<hex> DATABASE_URL=<url> \
//     pnpm tsx apps/isaak/app/lib/aeat-browser/cli.ts
//
// Required env vars:
//   DATABASE_URL / PRISMA_DATABASE_URL  — Postgres connection string
//   CERT_MASTER_KEY                     — AES-256 key (64-char hex)
//   AEAT_ENVIRONMENT                    — 'pre' | 'prod'  (default: pre)
//   AEAT_WORKER_BATCH_SIZE              — max submissions per run (default: 5)
//
// Optional:
//   AEAT_SUBMISSION_WORKER_ENABLED=true — must be set or worker exits immediately

import { processPendingSubmissions } from './submission-worker';
import { PlaywrightBrowserAdapter } from './adapters/playwright-stub';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

async function main() {
  if (process.env.AEAT_SUBMISSION_WORKER_ENABLED !== 'true') {
    console.log(
      'AEAT_SUBMISSION_WORKER_ENABLED is not "true". Set it to enable the worker. Exiting.'
    );
    process.exit(0);
  }

  requireEnv('CERT_MASTER_KEY');
  requireEnv('DATABASE_URL');

  const environment = (process.env.AEAT_ENVIRONMENT ?? 'pre') as 'pre' | 'prod';
  const maxBatch = Number(process.env.AEAT_WORKER_BATCH_SIZE ?? '5');

  if (environment !== 'pre' && environment !== 'prod') {
    console.error(`Invalid AEAT_ENVIRONMENT: "${environment}". Must be "pre" or "prod".`);
    process.exit(1);
  }

  if (environment === 'prod') {
    console.warn(
      '⚠️  Running against AEAT PROD. Submissions will be real. Press Ctrl+C within 5s to abort.'
    );
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(`[aeat-worker] env=${environment} maxBatch=${maxBatch}`);
  const start = Date.now();

  const result = await processPendingSubmissions({
    adapterFactory: () => new PlaywrightBrowserAdapter(),
    maxBatch,
    environment,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[aeat-worker] done in ${elapsed}s — processed=${result.processed} accepted=${result.accepted} rejected=${result.rejected} errors=${result.errors}`
  );

  if (result.details.length > 0) {
    for (const d of result.details) {
      const extra =
        d.finalStatus === 'accepted' ? `csv=${d.csvJustificante}` : `err="${d.errorMessage}"`;
      console.log(`  [${d.finalStatus}] submission=${d.submissionId} ${extra}`);
    }
  }

  const exitCode = result.errors > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[aeat-worker] Fatal error:', err);
  process.exit(1);
});
