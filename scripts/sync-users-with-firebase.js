#!/usr/bin/env node

/**
 * sync-users-with-firebase.js
 * 
 * Sincroniza usuarios entre Firebase Auth y PostgreSQL:
 * - Detecta usuarios en PostgreSQL que no existen en Firebase
 * - Permite eliminarlos o marcarlos como inactivos
 * 
 * Uso:
 *   node scripts/sync-users-with-firebase.js --dry-run   # Ver qué se eliminaría
 *   node scripts/sync-users-with-firebase.js --delete    # Eliminar usuarios huérfanos
 */

const admin = require('firebase-admin');
const { Pool } = require('pg');

// Verificar environment variables
const required = ['FIREBASE_SERVICE_ACCOUNT', 'DATABASE_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Falta variable de entorno: ${key}`);
    process.exit(1);
  }
}

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Inicializar PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const shouldDelete = process.argv.includes('--delete');

  if (!dryRun && !shouldDelete) {
    console.log('');
    console.log('⚠️  ADVERTENCIA: No se especificó --dry-run ni --delete');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/sync-users-with-firebase.js --dry-run   # Ver qué se eliminaría');
    console.log('  node scripts/sync-users-with-firebase.js --delete    # Eliminar usuarios huérfanos');
    console.log('');
    process.exit(1);
  }

  try {
    console.log('🔍 Obteniendo usuarios de Firebase Auth...');
    
    // Obtener todos los usuarios de Firebase
    const firebaseUsers = [];
    let nextPageToken;
    
    do {
      const listResult = await admin.auth().listUsers(1000, nextPageToken);
      firebaseUsers.push(...listResult.users.map(u => u.uid));
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);
    
    console.log(`✓ Firebase tiene ${firebaseUsers.length} usuarios`);
    
    // Obtener todos los usuarios de PostgreSQL
    console.log('🔍 Obteniendo usuarios de PostgreSQL...');
    const pgResult = await pool.query('SELECT id, email, name FROM users ORDER BY created_at DESC');
    const pgUsers = pgResult.rows;
    
    console.log(`✓ PostgreSQL tiene ${pgUsers.length} usuarios`);
    console.log('');
    
    // Comparar y encontrar huérfanos
    const orphanedUsers = pgUsers.filter(pgUser => !firebaseUsers.includes(pgUser.id));
    
    if (orphanedUsers.length === 0) {
      console.log('✅ ¡Perfecto! No hay usuarios huérfanos.');
      console.log('   Firebase y PostgreSQL están sincronizados.');
      process.exit(0);
    }
    
    // Mostrar usuarios huérfanos
    console.log(`⚠️  Encontrados ${orphanedUsers.length} usuarios en PostgreSQL que NO existen en Firebase:\n`);
    
    orphanedUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nombre: ${user.name || '(sin nombre)'}`);
      console.log('');
    });
    
    if (dryRun) {
      console.log('🔎 Modo --dry-run: No se eliminará nada.');
      console.log('   Para eliminar estos usuarios, ejecuta:');
      console.log('   node scripts/sync-users-with-firebase.js --delete');
      process.exit(0);
    }
    
    if (shouldDelete) {
      console.log('🗑️  Eliminando usuarios huérfanos de PostgreSQL...\n');
      
      for (const user of orphanedUsers) {
        try {
          // Eliminar en cascade (memberships, preferences, etc.)
          await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
          console.log(`✓ Eliminado: ${user.email} (${user.id})`);
        } catch (error) {
          console.error(`❌ Error eliminando ${user.email}:`, error.message);
        }
      }
      
      console.log('');
      console.log(`✅ Sincronización completada.`);
      console.log(`   Eliminados: ${orphanedUsers.length} usuarios`);
    }
    
  } catch (error) {
    console.error('❌ Error durante sincronización:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
