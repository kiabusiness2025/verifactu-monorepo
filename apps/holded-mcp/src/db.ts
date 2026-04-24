import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

export type DbClient = Pool | PoolClient;

let pool: Pool | null | undefined;

function shouldUseSsl(connectionString: string) {
  return (
    /sslmode=require/i.test(connectionString) || /neon\.tech|supabase\.co/i.test(connectionString)
  );
}

export function getDbPool() {
  if (!config.DATABASE_URL) {
    return null;
  }

  if (pool === undefined) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: shouldUseSsl(config.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (error) => {
      logger.error('PostgreSQL pool error:', error);
    });
  }

  return pool;
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  client: DbClient,
  sql: string,
  params: readonly unknown[] = []
) {
  const result = await client.query(sql, [...params]);
  return result.rows as unknown as T[];
}

export async function execute(client: DbClient, sql: string, params: readonly unknown[] = []) {
  await client.query(sql, [...params]);
}

export async function withDbTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const db = getDbPool();
  if (!db) {
    throw new Error('DATABASE_URL is not configured');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
