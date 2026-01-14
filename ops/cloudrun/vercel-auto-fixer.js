/**
 * Vercel Build Failure Auto-Fixer
 * Cloud Function para recibir webhooks de Vercel y auto-arreglar fallos conocidos
 * 
 * Deploy: gcloud functions deploy vercel-auto-fixer --runtime nodejs20 --trigger-http
 */

const functions = require('@google-cloud/functions-framework');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tipos de errores que podemos auto-arreglar
const AUTO_FIX_PATTERNS = {
  // Imports no encontrados
  MODULE_NOT_FOUND: {
    pattern: /Can't resolve '([^']+)'/,
    handler: fixModuleNotFound,
  },
  // Campos faltantes en Prisma
  PRISMA_MISSING_FIELD: {
    pattern: /Property '(\w+)' is missing in type/,
    handler: fixPrismaField,
  },
  // Type errors simples
  UNDEFINED_TYPE: {
    pattern: /Cannot find name '(\w+)'/,
    handler: fixUndefinedType,
  },
  // Import path errors
  IMPORT_PATH: {
    pattern: /Cannot find module '([^']+)'/,
    handler: fixImportPath,
  },
};

/**
 * Obtener secreto de Google Secret Manager
 */
async function getSecret(secretId, version = 'latest') {
  const client = new SecretManagerServiceClient();
  const projectId = process.env.GCP_PROJECT;
  
  const name = client.secretVersionPath(projectId, secretId, version);
  const [version_obj] = await client.accessSecretVersion({ name });
  return version_obj.payload.data.toString('utf-8');
}

/**
 * Parsear error de Vercel
 */
function parseVercelError(logs) {
  const lines = logs.split('\n');
  let errorInfo = {
    file: null,
    line: null,
    column: null,
    message: null,
    type: null,
  };

  for (const line of lines) {
    // Patrón: ./app/api/path/file.ts:89:7
    const fileMatch = line.match(/^\.\/([^:]+):(\d+):(\d+)/);
    if (fileMatch) {
      errorInfo.file = fileMatch[1];
      errorInfo.line = parseInt(fileMatch[2]);
      errorInfo.column = parseInt(fileMatch[3]);
    }

    // Identificar tipo de error
    for (const [type, pattern] of Object.entries(AUTO_FIX_PATTERNS)) {
      if (pattern.pattern.test(line)) {
        errorInfo.type = type;
        const match = line.match(pattern.pattern);
        if (match) {
          errorInfo.details = match[1];
        }
        break;
      }
    }

    if (line.includes('Type error:') || line.includes('Module not found:')) {
      errorInfo.message = line.trim();
    }
  }

  return errorInfo;
}

/**
 * Auto-fix: Module no encontrado
 */
function fixModuleNotFound(errorInfo, repoPath) {
  const { file, details } = errorInfo;
  const filePath = path.join(repoPath, file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ Archivo no encontrado: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let fixed = false;

  // Fix: @/lib/auth → @/lib/session
  if (details === '@/lib/auth') {
    content = content.replace(/from ['"]@\/lib\/auth['"]/g, "from '@/lib/session'");
    content = content.replace(/import { getSession }/g, 'import { getSessionPayload }');
    fixed = true;
  }

  // Fix: { prisma } → default export
  if (details === '@/lib/prisma') {
    content = content.replace(/import { prisma }/g, 'import prisma');
    fixed = true;
  }

  // Fix: @/lib/firebaseAdmin (no existe, usar @/lib/firebase)
  if (details === '@/lib/firebaseAdmin') {
    content = content.replace(/from ['"]@\/lib\/firebaseAdmin['"]/g, "from '@/lib/firebase'");
    content = content.replace(/initFirebaseAdmin\(\)/g, '// Firebase initialized in storage.ts');
    fixed = true;
  }

  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Auto-fixed module import: ${file}`);
    return true;
  }

  return false;
}

/**
 * Auto-fix: Campo faltante en Prisma
 */
function fixPrismaField(errorInfo, repoPath) {
  const { file, details, line } = errorInfo;
  const filePath = path.join(repoPath, file);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Casos conocidos
  if (details === 'createdBy') {
    // Buscar patrón prisma.*.create({ data: {
    let fixed = false;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes('create({') &&
        lines[i].includes('data:') &&
        !lines[i + 1].includes('createdBy:')
      ) {
        // Insertar createdBy si no existe
        lines.splice(i + 1, 0, '        createdBy: session.uid,');
        fixed = true;
      }
    }
    if (fixed) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`✅ Auto-fixed missing field: ${details}`);
      return true;
    }
  }

  if (details === 'tenantId') {
    // Agregar validación if (!session || !session.tenantId)
    let fixed = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('if (!session)') && !lines[i].includes('tenantId')) {
        lines[i] = lines[i].replace('if (!session)', 'if (!session || !session.tenantId)');
        fixed = true;
      }
    }
    if (fixed) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`✅ Auto-fixed type guard: ${details}`);
      return true;
    }
  }

  return false;
}

/**
 * Auto-fix: Type indefinido
 */
function fixUndefinedType(errorInfo, repoPath) {
  const { file, details } = errorInfo;
  const filePath = path.join(repoPath, file);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // getSession → getSessionPayload
  if (details === 'getSession') {
    content = content.replace(/getSession\(/g, 'getSessionPayload(');
    fs.writeFileSync(filePath, content);
    console.log(`✅ Auto-fixed undefined type: ${details}`);
    return true;
  }

  return false;
}

/**
 * Auto-fix: Import path incorrecto
 */
function fixImportPath(errorInfo, repoPath) {
  const { file, details } = errorInfo;
  const filePath = path.join(repoPath, file);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let fixed = false;

  // Rutas de email templates
  if (details.includes('emails/VerifyEmail')) {
    content = content.replace(/from ['"]\.\.\/emails\//g, "from '../../emails/");
    fixed = true;
  }

  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Auto-fixed import path: ${details}`);
    return true;
  }

  return false;
}

/**
 * Hacer commit y push
 */
function commitAndPush(repoPath, commitMessage) {
  try {
    // Configurar git
    execSync('git config user.email "isaak-bot@verifactu.dev"', { cwd: repoPath });
    execSync('git config user.name "Isaak Auto-Fixer"', { cwd: repoPath });

    // Commit
    execSync('git add -A', { cwd: repoPath });
    execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath });

    // Push
    execSync('git push origin main', { cwd: repoPath });

    console.log('✅ Changes committed and pushed');
    return true;
  } catch (error) {
    console.error('❌ Git error:', error.message);
    return false;
  }
}

/**
 * HTTP Cloud Function
 */
functions.http('vercel-auto-fixer', async (req, res) => {
  try {
    // Validar webhook de Vercel
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { deployment, builds } = req.body;

    // Solo procesar si falló
    if (!deployment || deployment.state !== 'ERROR') {
      return res.status(200).json({ message: 'Deployment succeeded, no action needed' });
    }

    console.log(`🔴 Build failed for: ${deployment.url}`);

    // Obtener tokens seguros
    const GITHUB_TOKEN = await getSecret('GITHUB_TOKEN');
    const VERCEL_TOKEN = await getSecret('VERCEL_API_KEY');

    // Parsear errores del log
    const logs = req.body.logs || '';
    const errorInfo = parseVercelError(logs);

    if (!errorInfo.file || !errorInfo.type) {
      console.log('⚠️ Could not identify error, skipping auto-fix');
      return res.status(200).json({ message: 'Error not auto-fixable' });
    }

    console.log(`📍 Error detected: ${errorInfo.type} in ${errorInfo.file}`);

    // Clonar repo
    const repoPath = '/tmp/verifactu-repo';
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }

    execSync(
      `git clone --depth 1 https://${GITHUB_TOKEN}@github.com/kiabusiness2025/verifactu-monorepo.git ${repoPath}`
    );

    // Aplicar fix
    const handler = AUTO_FIX_PATTERNS[errorInfo.type]?.handler;
    if (!handler) {
      console.log('⚠️ No handler for this error type');
      return res.status(200).json({ message: 'No auto-fix handler' });
    }

    const fixed = handler(errorInfo, repoPath);

    if (!fixed) {
      console.log('⚠️ Auto-fix failed');
      return res.status(200).json({ message: 'Auto-fix failed' });
    }

    // Commit y push
    const commitMsg = `fix(auto): ${errorInfo.type} - ${errorInfo.details}\n\nAuto-fixed by Isaak Bot\nOriginal error in ${errorInfo.file}:${errorInfo.line}`;
    commitAndPush(repoPath, commitMsg);

    return res.status(200).json({
      success: true,
      message: 'Auto-fix applied',
      error: errorInfo,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: error.message,
    });
  }
});
