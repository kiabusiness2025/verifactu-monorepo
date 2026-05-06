# Holded MCP PAT Deploy Runbook

**Fecha:** 2026-05-06
**Estado:** Validado en produccion
**Scope:** PAT infra, prisma, build, push, mint de token, uso operativo

---

## Resumen ejecutivo

En esta sesion quedaron validados y publicados en `main` los siguientes bloques:

- Infraestructura PAT para Holded MCP
- Preset `claude_parity`
- 3 tools nuevos:
  - `holded_list_crm_funnels`
  - `holded_list_leads`
  - `holded_list_time_records`
- Script CLI para acuñar PAT:
  - `apps/app/scripts/create-holded-pat.ts`
- Documento de plan mobile:
  - `docs/product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md`

Tambien quedo validado que:

- La migracion `20260506140000_add_holded_mcp_pat` ya estaba aplicada en la BD objetivo.
- `prisma migrate dev` no era el comando correcto para este momento operativo.
- El build correcto del producto se valida desde `apps/app` con `NODE_ENV=production`.

---

## Commits de la sesion

Publicados en `main`:

- `6d57f561` `feat(holded-mcp): add PAT migration and Claude parity tools`
- `628daea5` `feat(mcp-holded): add CLI PAT mint script`
- `ec7a33e1` `docs(mcp-holded): add mobile OAuth fix plan`

---

## Archivos clave

### Infra PAT

- `packages/db/prisma/migrations/20260506140000_add_holded_mcp_pat/migration.sql`
- `apps/app/lib/integrations/holdedPatStore.ts`
- `apps/app/app/api/mcp/holded/route.ts`

### Scopes y tools

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`
- `apps/app/lib/integrations/accounting.ts`

### Script CLI

- `apps/app/scripts/create-holded-pat.ts`

### Documentacion

- `docs/product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md`

---

## Leccion principal

Para este escenario de despliegue:

- `prisma migrate dev` puede parecer bloqueado aunque no haya nada pendiente.
- El camino correcto para una BD ya alineada y un repo ya migrado es:
  - `prisma migrate deploy`
  - `prisma generate`
  - build real de `apps/app`

No usar `pnpm --filter @verifactu/app build` en este monorepo. Ese filtro no coincide con ningun proyecto activo.

---

## Flujo correcto de deploy

Ejecutar desde el root del repo.

### 1. Cargar DATABASE_URL desde apps/holded/.env.local

```powershell
cd C:\dev\verifactu-monorepo
$envFile = 'C:\dev\verifactu-monorepo\apps\holded\.env.local'
$databaseUrlLine = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseUrlLine) { throw 'DATABASE_URL not found in apps/holded/.env.local' }
$env:DATABASE_URL = ($databaseUrlLine -replace '^DATABASE_URL=', '').Trim().Trim('"')
```

### 2. Prisma para deploy

```powershell
cd C:\dev\verifactu-monorepo\packages\db
pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
pnpm exec prisma generate --schema=./prisma/schema.prisma
```

Resultado validado en esta sesion:

```text
No pending migrations to apply.
Generated Prisma Client ...
```

### 3. Build correcto

```powershell
cd C:\dev\verifactu-monorepo\apps\app
$env:NODE_ENV = 'production'
pnpm build
```

Resultado validado en esta sesion:

- Compiled successfully
- Checking validity of types: OK
- Generating static pages: OK
- postbuild manifest fix: OK

---

## Por que parecia que se quedaba parado

### Caso 1. Prisma

`migrate dev` no era necesario porque la migracion ya estaba aplicada. Antes de insistir con ese comando, usar:

```powershell
cd C:\dev\verifactu-monorepo\packages\db
pnpm exec prisma migrate status --schema=./prisma/schema.prisma
```

En esta sesion devolvio:

```text
Database schema is up to date!
```

### Caso 2. Build

Los intentos con estos comandos confundian el diagnostico:

```powershell
pnpm --filter verifactu-app build
pnpm --filter @verifactu/app build
```

El build que realmente representa el estado valido local fue:

```powershell
cd C:\dev\verifactu-monorepo\apps\app
$env:NODE_ENV='production'
pnpm build
```

### Caso 3. PowerShell multilinea

Los comandos pegados con backticks invertidos suelen fallar o parecer colgados si se cortan mal al pegar.

Recomendacion:

- ejecutar en bloques cortos
- evitar un solo comando multilinea para `git add`
- evitar mezclar prisma, build y git en la misma pegada si se esta depurando

---

## Flujo correcto de git

Durante esta sesion, el codigo ya habia sido empujado antes del ultimo bloque de docs. El unico artefacto pendiente al final era:

- `docs/product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md`

Cuando el arbol ya esta casi limpio, comprobar primero:

```powershell
cd C:\dev\verifactu-monorepo
git status --short
git log --oneline -3
```

Si hace falta stagear varios paths, es mas estable hacerlo por grupos o en una sola linea simple:

```powershell
git add packages/db/prisma/migrations/20260506140000_add_holded_mcp_pat/migration.sql apps/app/lib/integrations/holdedPatStore.ts apps/app/lib/integrations/holdedMcpScopes.ts apps/app/lib/integrations/holdedMcpTools.ts apps/app/lib/integrations/accounting.ts apps/app/app/api/mcp/holded/route.ts apps/app/scripts/create-holded-pat.ts docs/product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md
```

---

## PAT creado en la sesion

Se genero correctamente un PAT real mediante el CLI.

Inputs usados:

- email: `soporte@verifactu.business`
- name: `test_mobil_v1`
- channel: `chatgpt`

El script valido que:

- existe usuario
- existe membership activa
- existe `ExternalConnection` Holded conectada
- el PAT se acuña ligado a esa conexion

Comando usado:

```powershell
cd C:\dev\verifactu-monorepo
$envFile = 'C:\dev\verifactu-monorepo\apps\holded\.env.local'
$databaseUrlLine = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseUrlLine) { throw 'DATABASE_URL not found in apps/holded/.env.local' }
$env:DATABASE_URL = ($databaseUrlLine -replace '^DATABASE_URL=', '').Trim().Trim('"')
pnpm exec tsx apps/app/scripts/create-holded-pat.ts --email soporte@verifactu.business --name "test_mobil_v1" --channel chatgpt
```

---

## Como usar un PAT en clientes compatibles

### Requisito importante

ChatGPT mobile no expone actualmente un campo Bearer/API key para conectores custom. Por eso el PAT es util para:

- pruebas internas
- scripts
- clientes compatibles con Bearer custom
- soporte
- Claude desktop u otros clientes MCP que acepten auth header manual

No resolvera por si solo el flujo mobile de ChatGPT si la app exige OAuth puro.

### Uso generico

- MCP URL:
  - `https://holded.verifactu.business/api/mcp/holded`
- Header:
  - `Authorization: Bearer <TOKEN>`

---

## Script CLI de mint

Archivo:

- `apps/app/scripts/create-holded-pat.ts`

Ejemplo de uso:

```powershell
cd C:\dev\verifactu-monorepo
$envFile = 'C:\dev\verifactu-monorepo\apps\holded\.env.local'
$databaseUrlLine = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$env:DATABASE_URL = ($databaseUrlLine -replace '^DATABASE_URL=', '').Trim().Trim('"')
pnpm exec tsx apps/app/scripts/create-holded-pat.ts --email soporte@verifactu.business --name "mobile-test-2026-05-06" --channel chatgpt
```

Flags soportados:

- `--email`
- `--name`
- `--channel chatgpt|claude|dashboard`
- `--expires-in-days N`

---

## Que hacer la proxima vez

### Si quieres desplegar PAT infra

Usa este bloque y no otro:

```powershell
cd C:\dev\verifactu-monorepo
$envFile = 'C:\dev\verifactu-monorepo\apps\holded\.env.local'
$databaseUrlLine = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseUrlLine) { throw 'DATABASE_URL not found in apps/holded/.env.local' }
$env:DATABASE_URL = ($databaseUrlLine -replace '^DATABASE_URL=', '').Trim().Trim('"')

cd C:\dev\verifactu-monorepo\packages\db
pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
pnpm exec prisma generate --schema=./prisma/schema.prisma

cd C:\dev\verifactu-monorepo\apps\app
$env:NODE_ENV='production'
pnpm build

cd C:\dev\verifactu-monorepo
git status --short
```

### Si necesitas revisar si de verdad falta migrar

```powershell
cd C:\dev\verifactu-monorepo\packages\db
pnpm exec prisma migrate status --schema=./prisma/schema.prisma
```

---

## Estado final de la sesion

- Migracion PAT presente en repo: si
- Migracion PAT aplicada en BD: si
- Prisma client actualizado: si
- Build de `apps/app` en produccion: si
- Commits subidos a `main`: si
- PAT real acuñado por CLI: si
- Plan de fix para mobile OAuth: documentado

---

## Nota estrategica

La infraestructura PAT esta correcta y util, pero el bloqueo de ChatGPT mobile sigue siendo de producto/flujo OAuth, no de persistencia ni de MCP runtime. El documento fuente para ese siguiente frente es:

- `docs/product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md`
