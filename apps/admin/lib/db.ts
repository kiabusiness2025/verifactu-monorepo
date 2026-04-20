import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@verifactu/db';
import { Pool } from 'pg';

export { prisma };

const globalForAdminDb = globalThis as typeof globalThis & {
  __adminPgPool?: Pool;
};

function isDirectPostgresUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  return /^postgres(ql)?:\/\//i.test(value.trim());
}

function normalizeEnvFileValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function readLocalAdminEnv() {
  if (process.env.NODE_ENV === 'production') {
    return {} as Partial<Record<'DIRECT_DATABASE_URL' | 'POSTGRES_URL' | 'DATABASE_URL', string>>;
  }

  const envPaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'apps', 'admin', '.env.local'),
  ];

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;

    const values: Partial<Record<'DIRECT_DATABASE_URL' | 'POSTGRES_URL' | 'DATABASE_URL', string>> =
      {};
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1);
      if (key === 'DIRECT_DATABASE_URL' || key === 'POSTGRES_URL' || key === 'DATABASE_URL') {
        values[key] = normalizeEnvFileValue(rawValue);
      }
    }

    return values;
  }

  return {} as Partial<Record<'DIRECT_DATABASE_URL' | 'POSTGRES_URL' | 'DATABASE_URL', string>>;
}

function hasPlaceholderHost(value: string) {
  try {
    const hostname = new URL(value.trim()).hostname.trim().toLowerCase();
    return hostname === 'host' || hostname === 'your-host';
  } catch {
    return false;
  }
}

function resolveConnectionString() {
  const localEnv = readLocalAdminEnv();
  const candidates = [
    localEnv.DIRECT_DATABASE_URL,
    localEnv.POSTGRES_URL,
    localEnv.DATABASE_URL,
    process.env.DIRECT_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ];

  for (const candidate of candidates) {
    if (isDirectPostgresUrl(candidate) && !hasPlaceholderHost(candidate)) {
      return candidate.trim();
    }
  }

  return null;
}

function shouldUseSsl(connectionString: string) {
  return !/localhost|127\.0\.0\.1/i.test(connectionString);
}

function getPool() {
  if (globalForAdminDb.__adminPgPool) {
    return globalForAdminDb.__adminPgPool;
  }

  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error(
      'Admin raw queries require POSTGRES_URL, DIRECT_DATABASE_URL, or a direct DATABASE_URL.'
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForAdminDb.__adminPgPool = pool;
  }

  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await getPool().query(sql, params || []);
  return result.rows as T[];
}

export async function one<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
