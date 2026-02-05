/**
 * Script para agregar membership de usuario admin a Empresa Demo SL
 * Ejecutar: node scripts/add-admin-to-demo.js [USER_ID]
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const pg = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está definida');
  process.exit(1);
}

// ID del usuario admin (kiabusiness2025@gmail.com)
// Deberías obtenerlo desde Firebase Console o ejecutar el script con el UID como argumento
const USER_ID = process.argv[2];

if (!USER_ID) {
  console.error('❌ Uso: node scripts/add-admin-to-demo.js [USER_ID]');
  console.error('   Ejemplo: node scripts/add-admin-to-demo.js ABC123xyz');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addAdminToDemo() {
  const client = await pool.connect();

  try {
    console.log(`🔄 Agregando usuario ${USER_ID} a Empresa Demo SL...`);

    // 1. Buscar Empresa Demo SL
    const demoResult = await client.query(
      "SELECT id, name FROM tenants WHERE name = 'Empresa Demo SL' AND is_demo = TRUE"
    );

    if (demoResult.rows.length === 0) {
      console.error('❌ Empresa Demo SL no encontrada');
      process.exit(1);
    }

    const demoTenantId = demoResult.rows[0].id;
    console.log(`✓ Empresa Demo SL encontrada: ${demoTenantId}`);

    // 2. Verificar si ya tiene membership
    const existingMembership = await client.query(
      'SELECT id FROM memberships WHERE user_id = $1 AND tenant_id = $2',
      [USER_ID, demoTenantId]
    );

    if (existingMembership.rows.length > 0) {
      console.log('ℹ️  El usuario ya tiene membership a Empresa Demo SL');
    } else {
      // 3. Crear membership
      await client.query(
        `INSERT INTO memberships (tenant_id, user_id, role, status, created_at)
         VALUES ($1, $2, 'member', 'active', NOW())`,
        [demoTenantId, USER_ID]
      );
      console.log('✓ Membership creada');
    }

    // 4. Actualizar preferred_tenant_id si no tiene
    const prefsResult = await client.query(
      'SELECT user_id, preferred_tenant_id FROM user_preferences WHERE user_id = $1',
      [USER_ID]
    );

    if (prefsResult.rows.length === 0) {
      // Crear preferencias
      await client.query(
        `INSERT INTO user_preferences (user_id, preferred_tenant_id, created_at)
         VALUES ($1, $2, NOW())`,
        [USER_ID, demoTenantId]
      );
      console.log('✓ Preferencias creadas con Empresa Demo como preferida');
    } else if (!prefsResult.rows[0].preferred_tenant_id) {
      // Actualizar preferencias
      await client.query(
        'UPDATE user_preferences SET preferred_tenant_id = $1 WHERE user_id = $2',
        [demoTenantId, USER_ID]
      );
      console.log('✓ Empresa Demo establecida como preferida');
    } else {
      console.log(
        `ℹ️  Usuario ya tiene tenant preferido: ${prefsResult.rows[0].preferred_tenant_id}`
      );
    }

    console.log('\n✅ Operación completada. Recarga la app para ver los cambios.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addAdminToDemo();
