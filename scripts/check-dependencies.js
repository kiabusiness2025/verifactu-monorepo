#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Verifica que todas las dependencias críticas estén instaladas
 * Uso: node scripts/check-dependencies.js <app-directory>
 */

const appDir = process.argv[2];

if (!appDir) {
  console.error('❌ Usage: node check-dependencies.js <app-directory>');
  console.error('   Example: node check-dependencies.js apps/app');
  process.exit(1);
}

const packageJsonPath = path.join(appDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error(`❌ package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

console.log(`\n🔍 Checking dependencies in ${appDir}...\n`);

// Dependencias críticas por app
const CRITICAL_DEPS_BY_APP = {
  'apps/app': {
    'lucide-react': {
      version: '^0.469.0',
      files: [
        'app/(dashboard)/dashboard/isaak/[id]/page.tsx',
        'app/(dashboard)/dashboard/isaak/page.tsx',
        'app/dashboard/admin-dashboard/page.tsx',
        'app/dashboard/admin/companies/[id]/page.tsx',
        'app/dashboard/admin/companies/new/page.tsx'
      ]
    },
    'framer-motion': {
      version: '^11.15.0',
      files: [
        'components/isaak/IsaakDeadlineNotifications.tsx',
        'components/isaak/IsaakPreferencesModal.tsx',
        'components/isaak/IsaakProactiveBubbles.tsx',
        'components/isaak/IsaakSmartFloating.tsx'
      ]
    },
    'next-auth': {
      version: '^4.24.11',
      files: [
        'app/dashboard/settings/page.tsx'
      ]
    },
    'decimal.js': {
      version: '^10.4.3',
      files: [
        'lib/hooks/useArticles.ts'
      ]
    },
    'resend': {
      version: '^4.1.0',
      files: [
        'app/api/admin/emails/send/custom/route.ts',
        'app/api/admin/emails/send/route.ts',
        'app/workflows/email-steps.ts'
      ]
    }
  },
  'apps/landing': {
    // Landing tiene menos dependencias críticas específicas
    // La mayoría son compartidas de Next.js
  }
};

// Obtener dependencias críticas para este app
const criticalDeps = CRITICAL_DEPS_BY_APP[appDir] || {};

// Leer package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error(`❌ Error reading package.json: ${error.message}`);
  process.exit(1);
}

const installedDeps = {
  ...packageJson.dependencies || {},
  ...packageJson.devDependencies || {}
};

let hasErrors = false;
let hasWarnings = false;

// Verificar cada dependencia crítica
for (const [dep, info] of Object.entries(criticalDeps)) {
  if (!installedDeps[dep]) {
    console.error(`❌ MISSING: ${dep}`);
    console.error(`   Recommended version: ${info.version}`);
    console.error(`   Required by:`);
    info.files.forEach(file => console.error(`     - ${file}`));
    console.error(`   Fix: npm install ${dep}@${info.version}\n`);
    hasErrors = true;
  } else {
    const installedVersion = installedDeps[dep];
    console.log(`✅ ${dep} (${installedVersion})`);
    
    // Advertencia si la versión no coincide (no bloqueante)
    if (info.version && !installedVersion.includes(info.version.replace('^', '').replace('~', ''))) {
      console.warn(`   ⚠️  Installed version ${installedVersion} differs from recommended ${info.version}`);
      hasWarnings = true;
    }
  }
}

// Verificar dependencias esenciales de Next.js
const essentialDeps = {
  'next': packageJson.dependencies?.next,
  'react': packageJson.dependencies?.react,
  'react-dom': packageJson.dependencies?.['react-dom']
};

console.log('\n📦 Essential Next.js dependencies:');
for (const [dep, version] of Object.entries(essentialDeps)) {
  if (version) {
    console.log(`✅ ${dep} (${version})`);
  } else {
    console.error(`❌ MISSING: ${dep} (required for Next.js)`);
    hasErrors = true;
  }
}

// Resumen
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('\n❌ VALIDATION FAILED');
  console.error('\nMissing critical dependencies detected.');
  console.error('Install them and try again:\n');
  console.error('  cd ' + appDir);
  console.error('  npm install\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  VALIDATION PASSED WITH WARNINGS');
  console.warn('\nSome dependency versions differ from recommended.');
  console.warn('Build may still work, but consider updating.\n');
  process.exit(0);
} else {
  console.log('\n✅ VALIDATION PASSED');
  console.log('\nAll critical dependencies are present!\n');
  process.exit(0);
}
