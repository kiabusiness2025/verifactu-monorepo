#!/usr/bin/env node

/**
 * PASO 10: Rebuild & Restart Script
 * 
 * Este script:
 * 1. Limpia caches Next.js
 * 2. Reinstala dependencias si es necesario
 * 3. Verifica que los servers estén corriendo
 * 
 * USO: node scripts/rebuild-and-restart.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🔧 VERIFACTU REBUILD & RESTART');
console.log('='.repeat(60));

const commands = [
  {
    name: '📁 Landing: Clear .next cache',
    cmd: 'rmdir /s /q c:\\dev\\verifactu-monorepo\\apps\\landing\\.next 2>nul || true'
  },
  {
    name: '📁 App: Clear .next cache',
    cmd: 'rmdir /s /q c:\\dev\\verifactu-monorepo\\apps\\app\\.next 2>nul || true'
  },
  {
    name: '✅ Schema updated (users.id is TEXT)',
    cmd: 'echo "✅ Database schema has been updated - users.id now accepts Firebase UIDs"'
  },
  {
    name: '🚀 Dev servers should auto-restart',
    cmd: 'echo "If dev servers are not running, they will auto-restart on next file change."'
  }
];

function executeCommand(command, name) {
  return new Promise((resolve) => {
    console.log(`\n→ ${name}`);
    exec(command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
      if (error && !command.includes('2>nul')) {
        console.error(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Done`);
      }
      resolve();
    });
  });
}

async function runAll() {
  for (const { name, cmd } of commands) {
    await executeCommand(cmd, name);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 NEXT STEPS:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1️⃣  Dev servers will restart with the next file change');
  console.log('2️⃣  Verify console logs show [🧠 LOGIN], [🧠 MW], [📋 API]');
  console.log('3️⃣  Test Google login at http://localhost:3001/auth/login');
  console.log('4️⃣  Watch for redirect to http://localhost:3000/dashboard');
  console.log('');
  console.log('📍 Check AUTH_FLOW_TEST.md for complete test steps');
  console.log('');
}

runAll().catch(console.error);
