#!/usr/bin/env node

/**
 * Script para actualizar nombre de usuario directamente en PostgreSQL
 * 
 * Uso: node scripts/update-user-name.js [USER_ID] [NOMBRE]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/app/.env.local') });
const { Pool } = require('pg');

async function main() {
  const userId = process.argv[2];
  const newName = process.argv[3];

  if (!userId || !newName) {
    console.error('❌ Uso: node scripts/update-user-name.js [USER_ID] [NOMBRE]');
    console.error('   Ejemplo: node scripts/update-user-name.js u2UkVM... "Ksenia"');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('db.prisma.io') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log(`🔄 Actualizando nombre de usuario ${userId}...\n`);

    // Verificar que el usuario existe
    const userCheck = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    const oldName = userCheck.rows[0].name;
    console.log(`📋 Nombre actual: "${oldName}"`);
    console.log(`📝 Nuevo nombre: "${newName}"\n`);

    // Actualizar
    await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2',
      [newName, userId]
    );

    console.log('✅ Nombre actualizado correctamente');
    console.log('\n💡 El usuario verá el nuevo nombre al recargar la app.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
