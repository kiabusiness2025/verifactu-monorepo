/**
 * Seed script: Crear "Empresa Demo SL" (solo tenant)
 * 
 * Empresa compartida para todos los nuevos usuarios.
 * Los datos de ejemplo se pueden agregar desde la UI.
 */

const pg = require("pg");

const DATABASE_URL = 'postgres://ac6301a89a331d0804886bc5ec74defbf3936e04b3df46e947d11351cd05781e:sk_L9ITUf1tpNp5pYgh_mMJV@db.prisma.io:5432/postgres?sslmode=require';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DEMO_TENANT = {
  name: "Empresa Demo SL",
  legal_name: "Empresa Demo Sociedad Limitada",
  nif: "B12345678",
  is_demo: true,
};

async function seedDemoTenant() {
  const client = await pool.connect();
  
  try {
    console.log("🌱 Iniciando seed de Empresa Demo SL...");

    // Verificar si ya existe
    const existingTenant = await client.query(
      "SELECT id, is_demo FROM tenants WHERE name = $1",
      [DEMO_TENANT.name]
    );

    let tenantId;

    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log(`ℹ️  Empresa Demo SL ya existe (ID: ${tenantId})`);
      
      // Actualizar flag is_demo y legal_name
      await client.query(
        "UPDATE tenants SET is_demo = TRUE, legal_name = $1 WHERE id = $2",
        [DEMO_TENANT.legal_name, tenantId]
      );
      console.log("   ✓ Campos actualizados");
    } else {
      // Crear tenant demo
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, legal_name, nif, is_demo, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [DEMO_TENANT.name, DEMO_TENANT.legal_name, DEMO_TENANT.nif, DEMO_TENANT.is_demo]
      );
      tenantId = tenantResult.rows[0].id;
      console.log(`✓ Empresa Demo SL creada (ID: ${tenantId})`);
    }

    console.log("\n📊 Tenant ID de Empresa Demo SL:");
    console.log(`   ${tenantId}`);
    console.log("\n✅ Seed completado. Agrega facturas y gastos desde la UI.");

  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoTenant();
