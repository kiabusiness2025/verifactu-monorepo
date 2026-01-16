#!/usr/bin/env node

/**
 * check-admin-user.js
 * 
 * Verifica si el usuario admin existe en PostgreSQL
 * 
 * Uso:
 *   node scripts/check-admin-user.js ofZb4dgbjVdyjOCZhMtXcjcsD7G2
 */

const { Pool } = require('pg');

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Falta el UUID del usuario');
  console.error('Uso: node scripts/check-admin-user.js <USER_ID>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log(`🔍 Buscando usuario: ${userId}\n`);
    
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        up.isaak_tone,
        up.has_completed_onboarding
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      console.log('❌ Usuario NO encontrado en PostgreSQL');
      console.log('');
      console.log('El usuario debe iniciar sesión al menos una vez para que');
      console.log('se cree automáticamente en la base de datos.');
      console.log('');
      console.log('Pasos:');
      console.log('1. Iniciar sesión en https://app.verifactu.business');
      console.log('2. El sistema creará automáticamente el registro');
      console.log('3. Ejecutar este script de nuevo');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Usuario ENCONTRADO\n');
    console.log(`Email: ${user.email}`);
    console.log(`Nombre: ${user.name || '(sin nombre)'}`);
    console.log(`Registrado: ${new Date(user.created_at).toLocaleString('es-ES')}`);
    console.log(`Tono Isaak: ${user.isaak_tone || 'friendly (default)'}`);
    console.log(`Onboarding: ${user.has_completed_onboarding ? 'Completado' : 'Pendiente'}`);
    console.log('');

    // Verificar memberships
    const membershipsResult = await pool.query(`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.is_demo,
        m.role,
        m.status
      FROM memberships m
      JOIN tenants t ON m.tenant_id = t.id
      WHERE m.user_id = $1
      ORDER BY t.created_at DESC
    `, [userId]);

    if (membershipsResult.rows.length > 0) {
      console.log(`📊 Empresas asociadas: ${membershipsResult.rows.length}\n`);
      membershipsResult.rows.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.tenant_name}`);
        console.log(`   Rol: ${m.role} | Status: ${m.status}${m.is_demo ? ' | DEMO' : ''}`);
      });
    } else {
      console.log('📊 Sin empresas asociadas aún');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
