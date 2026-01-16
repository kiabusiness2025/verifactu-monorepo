#!/usr/bin/env node

/**
 * Aplica migración 005: Tabla para compartir conversaciones de Isaak
 * 
 * Uso: node scripts/apply-conversation-sharing-migration.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/app/.env.local') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('db.prisma.io') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('🔄 Aplicando migración 005: Conversation Sharing...\n');

    const migrationPath = path.join(__dirname, '../db/migrations/005_add_conversation_sharing.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);

    console.log('✅ Migración aplicada correctamente');
    console.log('\n📊 Tabla creada:');
    console.log('   • isaak_conversation_shares (enlaces temporales)');
    console.log('\n💡 Ahora puedes compartir conversaciones con:');
    console.log('   • Enlaces temporales (24h)');
    console.log('   • Opcional: protección con password');
    console.log('   • Tracking de accesos\n');

  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
