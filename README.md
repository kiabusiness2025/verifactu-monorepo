📘 README — Integración completa del monorepo Verifactu Business en Google Cloud

Proyecto GCP: verifactu-business-480212
Monorepo: verifactu-monorepo
Servicios incluidos: Landing · App · API · Base de Datos

## 📦 Despliegue y Redeployment

Para información sobre cómo redesplegar versiones específicas a producción:
- **[MANUAL_REDEPLOY_STEPS.md](MANUAL_REDEPLOY_STEPS.md)** - Pasos manuales para redesplegar via Vercel UI
- **[REDEPLOY_GUIDE.md](REDEPLOY_GUIDE.md)** - Guía completa de opciones de redeployment (automatizado y manual)
- **Script de redeployment**: `./scripts/redeploy.sh <commit_hash> [environment]`

🧭 0. Objetivo del README

Este documento explica cómo:

Configurar Google Cloud para este monorepo.

Preparar el entorno en Cloud Shell.

Validar repositorio, dependencias y builds.

Configurar e integrar Cloud SQL (Postgres).

Preparar despliegues independientes por servicio:

apps/landing → Cloud Run

apps/app → Cloud Run

apps/api → Cloud Run

Estructura de variables de entorno.

Pipeline recomendado con Cloud Build.

Este README no crea tablas — solo prepara el entorno para que la app las cree al ejecutar su ORM.

---------------------------------------------------------------------
🚀 1. Configuración inicial del entorno en Cloud Shell
---------------------------------------------------------------------
1.1 Variables de proyecto

Ejecutar siempre al iniciar Cloud Shell:

export PROJECT_ID="verifactu-business-480212"
export REGION="europe-west1"
export REPO_DIR="$HOME/verifactu-monorepo"

gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

1.2 Instalar Node versión estable (ya incluido en Cloud Shell)

Cloud Shell viene con Node 20+:

node -v
npm -v


Si hiciera falta:

nvm install 20
nvm use 20

1.3 Identidad Git recomendada
git config --global user.name  "Soporte Verifactu"
git config --global user.email "soporte@verifactu.business"


Revisar:

git config --global --list

1.4 Clonar o usar el monorepo existente
cd $HOME
git clone https://github.com/kiabusiness2025/verifactu-monorepo.git


Si ya existe:

cd $REPO_DIR
git pull

---------------------------------------------------------------------
📦 2. Estructura del monorepo
---------------------------------------------------------------------
verifactu-monorepo/
│
├── apps/
│   ├── landing/   → Landing corporativa (Next.js)
│   ├── app/       → App de negocio (Next.js)
│   └── api/       → API firme VeriFactu (Node + Express)
│
├── infra/         → (opcional) Cloud Build, IaC, scripts
└── README.md


Cada “app” es un servicio independiente que se despliega por separado.

---------------------------------------------------------------------
🏗️ 3. Validación técnica del monorepo en GCP
---------------------------------------------------------------------

Antes de desplegar, validar que todo compila correctamente dentro del entorno Cloud Shell.

3.1 Landing
cd $REPO_DIR/apps/landing
npm ci
npm run build

3.2 App principal
cd $REPO_DIR/apps/app
npm ci
npm run lint
npm run build

3.3 API (Node + Express)
cd $REPO_DIR/apps/api
npm ci
npm test       # si jest está configurado
npm start      # test local


Si todo compila → se puede pasar a despliegues.

---------------------------------------------------------------------
🗄️ 4. Integración con Cloud SQL (Postgres)
---------------------------------------------------------------------
4.1 Instancia de base de datos existente

En este proyecto ya existe:

NAME: verifactu-db
ENGINE: PostgreSQL 15
REGION: europe-west1
PUBLIC IP: 146.148.21.12

4.2 Variables de entorno para servicios

Todos los servicios que necesiten BD deben recibir:

DATABASE_HOST=146.148.21.12
DATABASE_PORT=5432
DATABASE_USER=verifactu_user
DATABASE_PASSWORD=<<<SECRET>>>
DATABASE_NAME=verifactu_business
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE


Se almacenan en Secret Manager:

echo -n 'postgres://...' | gcloud secrets create DATABASE_URL --data-file=-


Dar acceso al servicio:

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member=serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

---------------------------------------------------------------------
🛠️ 5. Despliegue de servicios
---------------------------------------------------------------------

## 5.1 Landing - Vercel (Recomendado)

La landing se despliega automáticamente en **Vercel**:

1. Conectar el repositorio en vercel.com
2. Configuración automática:
   - Framework: Next.js (auto-detectado)
   - Root Directory: `apps/landing`
   - Build Command: `npm run build` (auto-detectado)
   - Output Directory: `.next`
3. Deploy automático en cada push a `main`

Alternativamente, desplegar localmente con Vercel CLI:
```bash
npm install -g vercel
vercel --prod
```

### Variables de entorno (Chat de Isaak)

Configurar en Vercel (Production y Preview):
- `ISAAC_API_KEY` (preferido) o `NEXT_PUBLIC_ISAAC_API_KEY`
- `ISAAC_ASSISTANT_ID` (opcional) o `NEXT_PUBLIC_ISAAC_ASSISTANT_ID`

Para desarrollo local en `apps/landing/.env.local`:
```env
ISAAC_API_KEY=tu_clave
ISAAC_ASSISTANT_ID=tu_asistente
# Compatibilidad si prefieres NEXT_PUBLIC
NEXT_PUBLIC_ISAAC_API_KEY=tu_clave
NEXT_PUBLIC_ISAAC_ASSISTANT_ID=tu_asistente
```

Luego:
```bash
cd apps/landing
npm run dev
```

## 5.2 App (Next.js) - Cloud Run

cd $REPO_DIR/apps/app

gcloud run deploy verifactu-app \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest

## 5.3 API (Node Express) - Cloud Run

cd $REPO_DIR/apps/api

gcloud run deploy verifactu-api \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest

---------------------------------------------------------------------
🔐 6. Secret Manager estándar del proyecto
---------------------------------------------------------------------

Variables típicas:

DATABASE_URL
JWT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
AEAT_CERTIFICATE_P12
AEAT_CERTIFICATE_PASSWORD


Crear un secreto:

echo -n "VALUE" | gcloud secrets create SECRET_NAME --data-file=-


Actualizar:

echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

---------------------------------------------------------------------
🔄 7. Pipeline recomendado (Cloud Build YAML)
---------------------------------------------------------------------

Ejemplo minimal:

steps:
  - name: "node:20"
    entrypoint: bash
    args:
      - -c
      - |
        cd apps/app
        npm ci
        npm run build

  - name: "gcr.io/cloud-builders/gcloud"
    args:
      [
        "run", "deploy", "verifactu-app",
        "--source=apps/app",
        "--region=europe-west1",
        "--allow-unauthenticated"
      ]

images: []

---------------------------------------------------------------------
🧩 8. Migración desde entornos previos
---------------------------------------------------------------------
✔ Recomendado:

Clonar repositorio limpio en el nuevo proyecto.

Validar builds en Cloud Shell.

Configurar secretos en Secret Manager.

Conectar con Cloud SQL (no crear tablas aún).

Implementar migrador ORM (Prisma recomendado).

Desplegar servicios uno por uno.

Verificar rutas, dominios y CORS.

---------------------------------------------------------------------
🧹 9. Mantenimiento del entorno Cloud Shell
---------------------------------------------------------------------

Para liberar espacio:

docker system prune -af
rm -rf ~/.npm
rm -rf ~/.cache
find $HOME -type d -name "node_modules" -prune -exec rm -rf {} +


Comprobar:

df -h $HOME

---------------------------------------------------------------------
✅ 10. Estado ideal antes de comenzar desarrollo
---------------------------------------------------------------------

El entorno está correctamente configurado cuando:

✔ node y npm funcionan
✔ el monorepo compila (landing, app, api)
✔ Cloud SQL responde a nivel de variables
✔ Secret Manager tiene los secretos clave
✔ Se puede desplegar un servicio simple a Cloud Run
✔ Los dominios están activos en Cloud Run / DNS
