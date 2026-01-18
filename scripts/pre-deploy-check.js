#!/usr/bin/env node

/**
 * Pre-Deploy Validation Script
 * Ejecuta validaciones antes de desplegar para prevenir errores
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHECKS = [
  {
    name: 'Prisma Schema Sync',
    run: () => {
      console.log('  → Checking Prisma schema...');
      execSync('cd apps/app && npx prisma validate', { stdio: 'inherit' });
    }
  },
  {
    name: 'TypeScript Compilation (App)',
    run: () => {
      console.log('  → Type-checking app...');
      execSync('cd apps/app && pnpm exec tsc --noEmit', { stdio: 'inherit' });
    }
  },
  {
    name: 'TypeScript Compilation (Landing)',
    run: () => {
      console.log('  → Type-checking landing...');
      execSync('cd apps/landing && pnpm exec tsc --noEmit', { stdio: 'inherit' });
    }
  },
  {
    name: 'Build Test (App)',
    run: () => {
      console.log('  → Test building app...');
      execSync('cd apps/app && pnpm run build', { stdio: 'inherit' });
    }
  },
  {
    name: 'Environment Variables',
    run: () => {
      console.log('  → Checking required env vars...');
      const requiredVars = [
        'DATABASE_URL',
        'FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_API_KEY'
      ];
      
      const envFile = path.join(__dirname, '../apps/app/.env');
      if (!fs.existsSync(envFile)) {
        throw new Error('.env file not found in apps/app/');
      }
      
      const envContent = fs.readFileSync(envFile, 'utf-8');
      const missing = requiredVars.filter(v => !envContent.includes(v + '='));
      
      if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(', ')}`);
      }
    }
  },
  {
    name: 'API Dependencies',
    run: () => {
      console.log('  → Checking API package.json...');
      const pkgPath = path.join(__dirname, '../apps/api/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      
      const required = ['qrcode', 'express', 'soap'];
      const missing = required.filter(dep => !pkg.dependencies[dep]);
      
      if (missing.length > 0) {
        throw new Error(`Missing API dependencies: ${missing.join(', ')}`);
      }
    }
  }
];

console.log('🔍 Running pre-deploy checks...\n');

let passed = 0;
let failed = 0;

for (const check of CHECKS) {
  try {
    console.log(`✓ ${check.name}`);
    check.run();
    passed++;
  } catch (error) {
    console.error(`✗ ${check.name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
  console.log('');
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('❌ Pre-deploy checks failed. Please fix the errors before deploying.');
  process.exit(1);
}

console.log('✅ All checks passed! Ready to deploy.');
process.exit(0);
