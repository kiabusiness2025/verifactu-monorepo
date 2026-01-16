/**
 * Script para aplicar migración: añadir logo_url a tenants
 */

const { Client } = require("pg");

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/verifactu_app"
  });

  try {
    console.log("🔄 Conectando a la base de datos...");
    await client.connect();
    
    console.log("🔄 Aplicando migración: add_tenant_logo...");
    
    await client.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS logo_url text;
    `);
    
    console.log("✅ Columna logo_url añadida a la tabla tenants");
    
    // Verificar que se añadió correctamente
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'logo_url';
    `);
    
    if (result.rows.length > 0) {
      console.log("✅ Verificación exitosa:", result.rows[0]);
    } else {
      console.error("❌ No se pudo verificar la columna");
    }
    
  } catch (error) {
    console.error("❌ Error aplicando migración:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log("✅ Conexión cerrada");
  }
}

applyMigration();
