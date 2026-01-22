#!/usr/bin/env node

/**
 * Configura GitHub Checks en Vercel para deployment protection
 * Este script habilita el deployment protection para que Vercel
 * espere a que pasen los workflows de GitHub Actions antes de desplegar
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Leer projectId y orgId desde .vercel/project.json
const projectPath = path.join(__dirname, '..', '.vercel', 'project.json');
const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = projectData.projectId;
const TEAM_ID = projectData.orgId;

if (!VERCEL_TOKEN) {
  console.error('❌ Error: VERCEL_TOKEN environment variable no está configurada');
  console.log('   Ejecuta: vercel token create');
  console.log('   Luego: set VERCEL_TOKEN=tu_token (Windows) o export VERCEL_TOKEN=tu_token (Linux/Mac)');
  process.exit(1);
}

console.log('📝 Configurando GitHub Checks para Vercel...\n');
console.log(`   Project ID: ${PROJECT_ID}`);
console.log(`   Team ID: ${TEAM_ID}\n`);

// Configuración para habilitar checks
const checksConfig = {
  deploymentProtection: {
    checks: [
      {
        name: 'Auto-Fix & Deploy',
        path: '.github/workflows/auto-fix-and-deploy.yml'
      }
    ]
  }
};

// Hacer request a la API de Vercel
const options = {
  hostname: 'api.vercel.com',
  path: `/v9/projects/${PROJECT_ID}`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

if (TEAM_ID.startsWith('team_')) {
  options.path += `?teamId=${TEAM_ID}`;
}

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ GitHub Checks configurados exitosamente!\n');
      console.log('📋 Configuración aplicada:');
      console.log('   - Deployment Protection: ENABLED');
      console.log('   - Check requerido: Auto-Fix & Deploy workflow');
      console.log('\n💡 Ahora Vercel esperará a que pasen los checks de GitHub antes de desplegar.\n');
    } else {
      console.error(`❌ Error al configurar checks (HTTP ${res.statusCode})`);
      console.error('Respuesta:', data);
      
      if (res.statusCode === 403) {
        console.log('\n💡 Tip: Asegúrate de que tu token tenga permisos para modificar el proyecto');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error.message);
});

req.write(JSON.stringify(checksConfig));
req.end();
