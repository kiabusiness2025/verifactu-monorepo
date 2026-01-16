/**
 * Script para aplicar migración 003: Add onboarding flags
 * 
 * Añade campos has_completed_onboarding y has_seen_welcome 
 * a la tabla user_preferences.
 */

const pg = require("pg");
const fs = require("fs");
const path = require("path");

// Usar URL directa de Prisma (actualizada)
const DATABASE_URL = 'postgres://ac6301a89a331d0804886bc5ec74defbf3936e04b3df46e947d11351cd05781e:sk_L9ITUf1tpNp5pYgh_mMJV@db.prisma.io:5432/postgres?sslmode=require';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log("🔄 Iniciando migración 003: Add onboarding flags...");
    
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, "..", "db", "migrations", "003_add_onboarding_flags.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
    
    // Ejecutar migración
    await client.query(migrationSQL);
    
    console.log("✅ Migración completada exitosamente");
    console.log("   - has_completed_onboarding column added");
    console.log("   - has_seen_welcome column added");
    console.log("   - Index created");
    
  } catch (error) {
    console.error("❌ Error en migración:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
