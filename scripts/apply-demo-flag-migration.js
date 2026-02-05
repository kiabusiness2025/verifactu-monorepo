/**
 * Script para aplicar migración 004: Add is_demo flag to tenants
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está definida');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migración 004: Add is_demo flag...');

    const migrationPath = path.join(
      __dirname,
      '..',
      'db',
      'migrations',
      '004_add_is_demo_flag.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await client.query(migrationSQL);

    console.log('✅ Migración completada exitosamente');
    console.log('   - is_demo column added to tenants');
    console.log('   - Index created');
    console.log('   - Empresa Demo SL marked as demo');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
