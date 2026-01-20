# Plan de Automatización de Deployments

**Objetivo:** Eliminar deployments fallidos mediante validación automática y auto-corrección.

## 🎯 Estrategia en 3 Fases

### Fase 1: Validación Pre-Deployment (Inmediato)
### Fase 2: Auto-Fix de Errores Comunes (2-3 días)
### Fase 3: Rollback Automático (1 semana)

---

## 📋 FASE 1: Validación Pre-Deployment

### GitHub Action: Pre-Push Validation

**Ubicación:** `.github/workflows/pre-deployment-check.yml`

```yaml
name: Pre-Deployment Validation

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [app, landing]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.20.0'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Check missing dependencies
        run: |
          node scripts/check-dependencies.js apps/${{ matrix.app }}
      
      - name: Build ${{ matrix.app }}
        run: |
          cd apps/${{ matrix.app }}
          npm run build
        env:
          CI: true
      
      - name: Type check
        run: |
          cd apps/${{ matrix.app }}
          npx tsc --noEmit
      
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Build failed for ${{ matrix.app }}. Check logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
            })
```

### Script: Validador de Dependencias

**Ubicación:** `scripts/check-dependencies.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appDir = process.argv[2] || 'apps/app';
const packageJsonPath = path.join(appDir, 'package.json');

console.log(`🔍 Checking dependencies in ${appDir}...`);

// Lista de dependencias críticas por archivo
const CRITICAL_DEPS = {
  'lucide-react': [
    'app/(dashboard)/dashboard/isaak/[id]/page.tsx',
    'app/(dashboard)/dashboard/isaak/page.tsx',
    'app/dashboard/admin-dashboard/page.tsx'
  ],
  'framer-motion': [
    'components/isaak/IsaakDeadlineNotifications.tsx',
    'components/isaak/IsaakPreferencesModal.tsx'
  ],
  'next-auth': [
    'app/dashboard/settings/page.tsx'
  ],
  'decimal.js': [
    'lib/hooks/useArticles.ts'
  ],
  'resend': [
    'app/api/admin/emails/send/route.ts',
    'app/workflows/email-steps.ts'
  ]
};

// Leer package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const installedDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};

let hasErrors = false;

// Verificar cada dependencia crítica
for (const [dep, files] of Object.entries(CRITICAL_DEPS)) {
  if (!installedDeps[dep]) {
    console.error(`❌ Missing dependency: ${dep}`);
    console.error(`   Required by: ${files.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${dep} (${installedDeps[dep]})`);
  }
}

if (hasErrors) {
  console.error('\n❌ Validation failed. Add missing dependencies and try again.');
  process.exit(1);
}

console.log('\n✅ All critical dependencies present!');
```

### Vercel Integration Settings

En el dashboard de Vercel para cada proyecto:

**Settings > Git > Ignored Build Step:**
```bash
#!/bin/bash

# Solo deployar si el commit pasa los checks de GitHub Actions
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]] ; then
  # Verificar que los GitHub Actions pasaron
  gh run list --branch $VERCEL_GIT_COMMIT_REF --limit 1 --json conclusion --jq '.[0].conclusion' | grep -q "success"
  if [ $? -eq 0 ]; then
    echo "✅ GitHub Actions passed. Proceeding with deployment."
    exit 1  # Proceed with build
  else
    echo "❌ GitHub Actions failed. Skipping deployment."
    exit 0  # Skip build
  fi
fi

exit 1  # Proceed for other branches
```

---

## 🤖 FASE 2: Auto-Fix con GitHub Copilot

### GitHub Action: Auto-Fix Common Errors

**Ubicación:** `.github/workflows/auto-fix-deployment-errors.yml`

```yaml
name: Auto-Fix Deployment Errors

on:
  workflow_dispatch:
    inputs:
      error_type:
        description: 'Error type to fix'
        required: true
        type: choice
        options:
          - missing_dependency
          - type_error
          - build_failure
  
  repository_dispatch:
    types: [vercel_build_failed]

jobs:
  auto-fix:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.20.0'
      
      - name: Parse Vercel Error
        id: parse_error
        run: |
          # Obtener último deployment de Vercel
          ERROR_LOG=$(vercel logs --token=${{ secrets.VERCEL_TOKEN }} --last)
          
          # Detectar tipo de error
          if echo "$ERROR_LOG" | grep -q "Module not found"; then
            MISSING_PKG=$(echo "$ERROR_LOG" | grep "Module not found" | sed -E "s/.*Can't resolve '([^']+)'.*/\1/")
            echo "error_type=missing_dependency" >> $GITHUB_OUTPUT
            echo "missing_package=$MISSING_PKG" >> $GITHUB_OUTPUT
          fi
      
      - name: Fix Missing Dependency
        if: steps.parse_error.outputs.error_type == 'missing_dependency'
        run: |
          PKG="${{ steps.parse_error.outputs.missing_package }}"
          echo "📦 Installing missing package: $PKG"
          
          cd apps/app
          npm install $PKG
          
          # Verificar que el build funciona
          npm run build
      
      - name: Create Fix PR
        if: success()
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "fix: add missing dependency ${{ steps.parse_error.outputs.missing_package }}"
          title: "🤖 Auto-fix: Missing dependency"
          body: |
            ## 🤖 Automated Fix
            
            **Error detected:** Missing dependency `${{ steps.parse_error.outputs.missing_package }}`
            
            **Action taken:**
            - Installed package via npm
            - Verified local build passes
            
            **Vercel error log:**
            ```
            ${{ steps.parse_error.outputs.error_log }}
            ```
            
            Please review and merge if appropriate.
          branch: auto-fix/missing-dep-${{ github.run_number }}
          labels: automated, bug-fix
```

### Webhook: Vercel Build Failed

**Configuración en Vercel:**
1. Settings > Webhooks > Add Webhook
2. URL: `https://api.github.com/repos/kiabusiness2025/verifactu-monorepo/dispatches`
3. Events: `deployment.failed`
4. Secret: `${{ secrets.WEBHOOK_SECRET }}`

**Payload que enviará Vercel:**
```json
{
  "event_type": "vercel_build_failed",
  "client_payload": {
    "deployment_id": "...",
    "error_log": "...",
    "commit_sha": "..."
  }
}
```

---

## 🔄 FASE 3: Rollback Automático

### GitHub Action: Auto-Rollback on Failure

**Ubicación:** `.github/workflows/auto-rollback.yml`

```yaml
name: Auto-Rollback on Deployment Failure

on:
  repository_dispatch:
    types: [vercel_deployment_failed]

jobs:
  rollback:
    runs-on: ubuntu-latest
    if: github.event.client_payload.auto_rollback == 'true'
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 10  # Últimos 10 commits
      
      - name: Find Last Successful Deployment
        id: find_good_commit
        run: |
          # Obtener deployments de Vercel
          DEPLOYMENTS=$(curl -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            "https://api.vercel.com/v6/deployments?projectId=${{ secrets.VERCEL_PROJECT_ID }}&limit=10")
          
          # Encontrar último deployment exitoso
          GOOD_COMMIT=$(echo "$DEPLOYMENTS" | jq -r '.deployments[] | select(.state == "READY") | .meta.githubCommitSha' | head -1)
          
          echo "good_commit=$GOOD_COMMIT" >> $GITHUB_OUTPUT
          echo "📍 Last successful deployment: $GOOD_COMMIT"
      
      - name: Create Rollback Commit
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          
          # Revertir al commit bueno
          git revert --no-commit ${{ steps.find_good_commit.outputs.good_commit }}..HEAD
          git commit -m "revert: automatic rollback to stable deployment (${{ steps.find_good_commit.outputs.good_commit }})"
          git push
      
      - name: Notify Team
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🔄 Automatic rollback triggered",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Failed - Auto Rollback Initiated*\n\n*Rolled back to:* `${{ steps.find_good_commit.outputs.good_commit }}`\n*Failed commit:* `${{ github.sha }}`"
                  }
                }
              ]
            }
```

### Vercel Protection Settings

**En Vercel Dashboard:**

1. **Settings > Deployment Protection:**
   - ✅ Enable "Vercel Authentication" for previews
   - ✅ Enable "Production Protection" para main branch

2. **Settings > Git > Production Branch:**
   - Branch: `main`
   - Auto-deploy: `Only when checks pass`

3. **Settings > Environment Variables:**
   ```
   ENABLE_AUTO_ROLLBACK=true
   ROLLBACK_ON_ERROR_TYPES=build_failure,type_error,missing_dependency
   ```

---

## 📊 Dashboarding y Monitoreo

### GitHub Actions Dashboard

Crear archivo: `.github/workflows/dashboard.yml`

```yaml
name: Deployment Dashboard

on:
  schedule:
    - cron: '0 */6 * * *'  # Cada 6 horas
  workflow_dispatch:

jobs:
  update-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Collect Deployment Stats
        run: |
          # Obtener estadísticas de Vercel
          node scripts/generate-deployment-report.js > DEPLOYMENT_STATUS.md
      
      - name: Commit Dashboard
        run: |
          git config user.name "Dashboard Bot"
          git config user.email "bot@github.com"
          git add DEPLOYMENT_STATUS.md
          git commit -m "docs: update deployment dashboard" || echo "No changes"
          git push
```

### Script: Generador de Reporte

**Ubicación:** `scripts/generate-deployment-report.js`

```javascript
#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

async function getDeployments() {
  // Llamar a Vercel API
  const response = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=50`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  return response.json();
}

async function generateReport() {
  const deployments = await getDeployments();
  
  const stats = {
    total: deployments.deployments.length,
    successful: deployments.deployments.filter(d => d.state === 'READY').length,
    failed: deployments.deployments.filter(d => d.state === 'ERROR').length,
    building: deployments.deployments.filter(d => d.state === 'BUILDING').length
  };
  
  const successRate = ((stats.successful / stats.total) * 100).toFixed(1);
  
  console.log(`# 📊 Deployment Status Report`);
  console.log(`\n**Last Updated:** ${new Date().toISOString()}\n`);
  console.log(`## Overall Statistics\n`);
  console.log(`- **Success Rate:** ${successRate}%`);
  console.log(`- **Total Deployments:** ${stats.total}`);
  console.log(`- **Successful:** ✅ ${stats.successful}`);
  console.log(`- **Failed:** ❌ ${stats.failed}`);
  console.log(`- **In Progress:** 🔄 ${stats.building}\n`);
  
  console.log(`## Recent Deployments\n`);
  console.log(`| Time | Commit | Status | Duration |`);
  console.log(`|------|--------|--------|----------|`);
  
  deployments.deployments.slice(0, 10).forEach(d => {
    const status = d.state === 'READY' ? '✅' : d.state === 'ERROR' ? '❌' : '🔄';
    const duration = d.ready ? `${Math.round((d.ready - d.createdAt) / 1000)}s` : 'N/A';
    console.log(`| ${new Date(d.createdAt).toLocaleString()} | ${d.meta.githubCommitSha?.slice(0, 7)} | ${status} ${d.state} | ${duration} |`);
  });
}

generateReport().catch(console.error);
```

---

## 🎯 Plan de Implementación

### Semana 1: Validación (INMEDIATO)
- [ ] Crear `.github/workflows/pre-deployment-check.yml`
- [ ] Crear `scripts/check-dependencies.js`
- [ ] Configurar GitHub Actions en el repositorio
- [ ] Testear con PR de prueba
- [ ] Documentar en `VERCEL_DEPLOYMENT_GUIDE.md`

### Semana 2: Auto-Fix
- [ ] Implementar `.github/workflows/auto-fix-deployment-errors.yml`
- [ ] Configurar Vercel webhook
- [ ] Crear script de parsing de errores
- [ ] Testear con deployment fallido intencional
- [ ] Configurar notificaciones Slack

### Semana 3: Rollback Automático
- [ ] Implementar `.github/workflows/auto-rollback.yml`
- [ ] Configurar Vercel Protection Settings
- [ ] Implementar lógica de detección de commit estable
- [ ] Testear rollback manual
- [ ] Activar auto-rollback en producción

### Semana 4: Monitoring
- [ ] Crear dashboard de deployments
- [ ] Configurar alertas automáticas
- [ ] Documentar proceso completo
- [ ] Capacitar equipo en nuevos workflows

---

## 🔐 Secrets Requeridos

Configurar en GitHub > Settings > Secrets and variables > Actions:

```bash
VERCEL_TOKEN=<token-de-vercel>
VERCEL_PROJECT_ID=<id-del-proyecto>
VERCEL_ORG_ID=<id-de-organizacion>
WEBHOOK_SECRET=<secret-aleatorio>
SLACK_WEBHOOK=<webhook-de-slack> (opcional)
```

---

## 📈 Métricas de Éxito

### KPIs a Monitorear

1. **Tasa de Éxito de Deployments:** > 95%
2. **Tiempo Promedio de Build:** < 3 minutos
3. **Tiempo de Detección de Errores:** < 1 minuto
4. **Tiempo de Auto-Fix:** < 5 minutos
5. **Deployments Fallidos Consecutivos:** = 0

### Alertas Configurar

- ❌ 2+ deployments fallidos consecutivos → Auto-rollback
- ⚠️ Build > 5 minutos → Notificación Slack
- ✅ Deployment exitoso después de auto-fix → Notificación equipo

---

## 🎓 Próximos Pasos Inmediatos

1. **Revisar y aprobar este plan**
2. **Crear secrets en GitHub**
3. **Implementar Fase 1 (validación pre-deployment)**
4. **Testear con PR de prueba**
5. **Iterar basado en resultados**

¿Quieres que proceda con la implementación de la Fase 1?
