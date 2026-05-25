#!/usr/bin/env node
/**
 * Wrapper de `prisma migrate deploy` que resuelve migraciones fallidas (P3009)
 * antes de aplicar las nuevas.
 *
 * Prisma bloquea todos los deploys si encuentra una migración en estado
 * "failed" en la base de datos. Este script la marca como "rolled_back"
 * para que Prisma la reintente en el mismo deploy.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = dirname(__dirname); // packages/db

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: pkgDir, ...opts });
}

function runSilent(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', cwd: pkgDir });
    return true;
  } catch {
    return false;
  }
}

// Migraciones conocidas que pueden quedar en estado "failed" por requerir
// extensiones de BD (pgvector) que no estaban activas cuando se aplicaron.
const RESOLVE_BEFORE_DEPLOY = [
  '20260527000000_isaak_long_term_memory',
];

for (const migration of RESOLVE_BEFORE_DEPLOY) {
  const resolved = runSilent(
    `npx prisma migrate resolve --rolled-back ${migration}`
  );
  if (resolved) {
    console.log(`[migrate-deploy] Resuelto estado "failed" de: ${migration}`);
  }
}

run('npx prisma migrate deploy');
