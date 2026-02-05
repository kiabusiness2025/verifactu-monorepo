#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/**
 * Apply Isaak tone migration to production database
 * Run: node scripts/apply-isaak-tone-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Extraer DATABASE_URL sin Prisma Accelerate
const PRISMA_URL = process.env.DATABASE_URL;

if (!PRISMA_URL) {
  console.error('❌ Error: DATABASE_URL no está definida');
  process.exit(1);
}

// Usar DATABASE_URL del entorno
const DATABASE_URL = PRISMA_URL;

async function runMigration() {
  console.log('🔗 Conectando a la base de datos...');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Conexión establecida');
    console.log('');

    // Leer el archivo de migración
    const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '002_add_isaak_tone.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Ejecutando migración: 002_add_isaak_tone.sql');
    console.log('');
    console.log('Cambios a aplicar:');
    console.log('  • Añadir columna isaak_tone a user_preferences');
    console.log('  • Añadir constraint para validar valores');
    console.log('  • Crear índice para optimización');
    console.log('');

    // Ejecutar el SQL
    await client.query(sql);

    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('Columna isaak_tone añadida con valores:');
    console.log('  • friendly (por defecto)');
    console.log('  • professional');
    console.log('  • minimal');
    console.log('');
    console.log('🚀 La funcionalidad está lista para usar en:');
    console.log('   Dashboard > Configuración > Isaak');
    console.log('');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    console.error('');
    console.error('Detalles:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
