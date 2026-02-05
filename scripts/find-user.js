/**
 * Script para encontrar el UID de un usuario por email
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const pg = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está definida');
  process.exit(1);
}

const EMAIL = process.argv[2] || 'kiabusiness2025@gmail.com';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function findUser() {
  const client = await pool.connect();

  try {
    console.log(`🔍 Buscando usuario: ${EMAIL}`);

    const result = await client.query(
      'SELECT id, email, name, created_at FROM users WHERE email = $1',
      [EMAIL]
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
    } else {
      const user = result.rows[0];
      console.log('\n✅ Usuario encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.name || '(sin nombre)'}`);
      console.log(`   Creado: ${user.created_at}`);

      // Buscar memberships
      const memberships = await client.query(
        `SELECT m.role, m.status, t.name as tenant_name, t.is_demo
         FROM memberships m
         JOIN tenants t ON t.id = m.tenant_id
         WHERE m.user_id = $1`,
        [user.id]
      );

      console.log(`\n📋 Memberships (${memberships.rows.length}):`);
      memberships.rows.forEach((m) => {
        const demoTag = m.is_demo ? ' [DEMO]' : '';
        console.log(`   - ${m.tenant_name}${demoTag} (${m.role}, ${m.status})`);
      });

      // Preferencias
      const prefs = await client.query(
        `SELECT preferred_tenant_id, 
                (SELECT name FROM tenants WHERE id = preferred_tenant_id) as preferred_tenant_name
         FROM user_preferences WHERE user_id = $1`,
        [user.id]
      );

      if (prefs.rows.length > 0 && prefs.rows[0].preferred_tenant_id) {
        console.log(`\n⭐ Tenant preferido: ${prefs.rows[0].preferred_tenant_name}`);
      }

      console.log(`\n💡 Para agregar a Empresa Demo:`);
      console.log(`   node scripts/add-admin-to-demo.js ${user.id}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

findUser();
