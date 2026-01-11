// Script para ejecutar migración de base de datos
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está definida');
    console.error('Uso: DATABASE_URL="postgres://..." node scripts/run-migration.js');
    process.exit(1);
  }

  console.log('🔗 Conectando a la base de datos...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conexión establecida');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'db', 'init-complete.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Ejecutando migración...');
    console.log('');

    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('📊 Verificando tablas creadas...');
    
    // Verificar tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('');
    console.log('Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verificar planes insertados
    const plansResult = await client.query('SELECT code, name FROM plans ORDER BY id;');
    console.log('');
    console.log('Planes de suscripción:');
    plansResult.rows.forEach(plan => {
      console.log(`  ✓ ${plan.code}: ${plan.name}`);
    });
    
    // Verificar categorías de gastos
    const categoriesResult = await client.query('SELECT code, name FROM expense_categories ORDER BY id;');
    console.log('');
    console.log('Categorías de gastos:');
    categoriesResult.rows.forEach(cat => {
      console.log(`  ✓ ${cat.code}: ${cat.name}`);
    });
    
    console.log('');
    console.log('🎉 Base de datos lista para usar');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    if (error.detail) {
      console.error('Detalle:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
