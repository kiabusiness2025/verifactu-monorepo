#!/usr/bin/env node
/**
 * Script para aplicar migraciones de base de datos usando Node.js
 * Alternativa a psql para cuando no esté disponible en el PATH
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function applyMigration() {
  // Obtener DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL no está configurada');
    console.error('Asegúrate de que .env.local tiene DATABASE_URL');
    process.exit(1);
  }

  console.log('📝 Conectando a la base de datos...');
  
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '../db/migrations/003_add_email_responses_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Archivo no encontrado: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📤 Aplicando migración: 003_add_email_responses_table.sql');
    
    // Ejecutar migración
    await pool.query(migrationSQL);
    
    console.log('✅ Migración aplicada exitosamente');
    
    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('admin_emails', 'admin_email_responses')
      ORDER BY table_name;
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No se encontraron tablas esperadas');
    } else {
      result.rows.forEach(row => {
        console.log(`✅ Tabla encontrada: ${row.table_name}`);
      });
    }

    // Listar columnas de admin_email_responses
    console.log('\n📋 Columnas en admin_email_responses:\n');
    
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'admin_email_responses'
      ORDER BY ordinal_position;
    `);
    
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)';
      console.log(`  • ${col.column_name}: ${col.data_type} ${nullable}`);
    });

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Próximo paso: pnpm dev\n');

  } catch (error) {
    console.error('❌ Error aplicando migración:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  No se puede conectar a la base de datos');
      console.error('Verifica que PostgreSQL está corriendo y DATABASE_URL es correcta');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
applyMigration();
