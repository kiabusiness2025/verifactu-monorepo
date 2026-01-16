/**
 * Script para verificar y aplicar migración de logo_url a tenants
 * Ejecutar con: node scripts/check-and-apply-logo-migration.js
 */

const { Client } = require("pg");

async function main() {
  // Leer DATABASE_URL del entorno
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL no está definida");
    console.log("Ejemplo de uso:");
    console.log('DATABASE_URL="postgresql://user:pass@host:5432/dbname" node scripts/check-and-apply-logo-migration.js');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log("🔄 Conectando a la base de datos...");
    await client.connect();
    console.log("✅ Conectado exitosamente");
    
    // Verificar si la columna ya existe
    console.log("\n🔍 Verificando si logo_url ya existe...");
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'logo_url';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log("✅ La columna logo_url ya existe:");
      console.log("   Tipo:", checkResult.rows[0].data_type);
      console.log("\n✨ No es necesario aplicar la migración");
      process.exit(0);
    }
    
    console.log("⚠️  La columna logo_url NO existe, aplicando migración...\n");
    
    // Aplicar migración
    await client.query(`
      ALTER TABLE tenants 
      ADD COLUMN logo_url text;
    `);
    
    console.log("✅ Columna logo_url añadida exitosamente");
    
    // Verificar que se aplicó correctamente
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'logo_url';
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log("✅ Verificación exitosa:");
      console.log("   Columna:", verifyResult.rows[0].column_name);
      console.log("   Tipo:", verifyResult.rows[0].data_type);
      console.log("\n✨ Migración aplicada correctamente");
    } else {
      console.error("❌ La verificación falló - no se pudo confirmar la columna");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code) {
      console.error("   Código:", error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n🔌 Conexión cerrada");
  }
}

main();
