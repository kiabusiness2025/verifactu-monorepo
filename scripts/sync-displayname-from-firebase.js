#!/usr/bin/env node

/**
 * Script para sincronizar displayName desde Firebase Auth a PostgreSQL
 * 
 * Uso: node scripts/sync-displayname-from-firebase.js [USER_ID]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/app/.env.local') });
const { Pool } = require('pg');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Uso: node scripts/sync-displayname-from-firebase.js [USER_ID]');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('db.prisma.io') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log(`🔄 Sincronizando displayName para usuario ${userId}...\n`);

    // 1. Obtener usuario de Firebase Auth
    const firebaseUser = await admin.auth().getUser(userId);
    
    console.log('📋 Datos de Firebase Auth:');
    console.log(`   Email: ${firebaseUser.email}`);
    console.log(`   Display Name: ${firebaseUser.displayName || '(no definido)'}`);
    console.log(`   Photo URL: ${firebaseUser.photoURL || '(no definido)'}`);

    // 2. Obtener usuario de PostgreSQL
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.error('\n❌ Usuario no encontrado en PostgreSQL');
      process.exit(1);
    }

    const dbUser = userResult.rows[0];
    console.log('\n📋 Datos actuales en PostgreSQL:');
    console.log(`   Email: ${dbUser.email}`);
    console.log(`   Name: ${dbUser.name}`);

    // 3. Actualizar si hay displayName en Firebase
    if (firebaseUser.displayName && firebaseUser.displayName.trim() !== '') {
      const newName = firebaseUser.displayName.trim();
      
      await pool.query(
        'UPDATE users SET name = $1 WHERE id = $2',
        [newName, userId]
      );

      console.log(`\n✅ Nombre actualizado en PostgreSQL: "${newName}"`);
      console.log('   El usuario verá su nombre real en próximo login.');
    } else {
      console.log('\n⚠️  Firebase Auth no tiene displayName configurado');
      console.log('   El usuario debe actualizar su perfil en Firebase Console o desde la app.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
