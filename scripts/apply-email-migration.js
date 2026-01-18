const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || "postgres://ac6301a89a331d0804886bc5ec74defbf3936e04b3df46e947d11351cd05781e:sk_4DiO6MaTSwrdOJXitAE8H@db.prisma.io:5432/postgres?sslmode=require";

console.log('\n🗄️  Migración de Emails - VeriFactu Business\n');
console.log('📋 Conectando a PostgreSQL...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    // Leer archivo de migración
    const migrationFile = path.join(__dirname, '..', 'db', 'migrations', '003_create_emails_table.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('   ✓ Archivo de migración cargado');
    console.log('   ✓ Conectado a Prisma.io PostgreSQL');
    
    // Ejecutar migración
    console.log('\n🚀 Aplicando migración...\n');
    await pool.query(sql);
    
    console.log('✅ Migración aplicada exitosamente\n');
    
    // Verificar tabla creada
    console.log('📊 Verificando tabla admin_emails...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'admin_emails'
      ORDER BY ordinal_position;
    `);
    
    if (result.rows.length > 0) {
      console.log(`   ✓ Tabla creada con ${result.rows.length} columnas:`);
      result.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'admin_emails';
    `);
    
    if (indexes.rows.length > 0) {
      console.log(`\n   ✓ ${indexes.rows.length} índices creados`);
    }
    
    console.log('\n🎉 ¡Todo listo!\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Configura RESEND_WEBHOOK_SECRET en .env.local');
    console.log('   2. Reinicia el servidor: pnpm dev');
    console.log('   3. Envía un email de prueba a soporte@verifactu.business');
    console.log('   4. Verifica en /dashboard/admin/emails\n');
    
  } catch (error) {
    console.error('\n❌ Error al aplicar migración:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
