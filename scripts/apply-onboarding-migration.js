/**
 * Script para aplicar migración 003: Add onboarding flags
 *
 * Añade campos has_completed_onboarding y has_seen_welcome
 * a la tabla user_preferences.
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Usar URL directa de Prisma (actualizada)
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
    console.log('🔄 Iniciando migración 003: Add onboarding flags...');

    // Leer archivo de migración
    const migrationPath = path.join(
      __dirname,
      '..',
      'db',
      'migrations',
      '003_add_onboarding_flags.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Ejecutar migración
    await client.query(migrationSQL);

    console.log('✅ Migración completada exitosamente');
    console.log('   - has_completed_onboarding column added');
    console.log('   - has_seen_welcome column added');
    console.log('   - Index created');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
