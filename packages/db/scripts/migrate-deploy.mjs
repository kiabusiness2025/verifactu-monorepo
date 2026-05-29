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

try {
  run('npx prisma migrate deploy');
} catch (err) {
  // P1001 = no se puede alcanzar la BD por TCP (ej. servidores de build de Vercel
  // no tienen acceso directo a db.prisma.io:5432).
  // Prisma Postgres soporta `migrate deploy` también via Prisma Accelerate (HTTPS).
  // Si PRISMA_DATABASE_URL está disponible, reintentamos sobreescribiendo DATABASE_URL.
  const isNetworkError = err instanceof Error && err.message.includes('P1001');
  const accelerateUrl = process.env.PRISMA_DATABASE_URL;
  if (isNetworkError && accelerateUrl) {
    console.warn('[migrate-deploy] P1001: conexión directa no disponible desde este entorno.');
    console.log('[migrate-deploy] Reintentando via Prisma Accelerate...');
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = accelerateUrl;
    try {
      run('npx prisma migrate deploy');
    } finally {
      process.env.DATABASE_URL = prev;
    }
  } else {
    throw err;
  }
}
