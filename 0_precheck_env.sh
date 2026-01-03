#!/usr/bin/env bash
set -e

echo "==============================="
echo " 0. VARIABLES DE ENTORNO BASE "
echo "==============================="

PROJECT_ID="verifactu-business-480212"
REGION="europe-west1"
REPO_DIR="$HOME/verifactu-monorepo"

echo "PROJECT_ID = $PROJECT_ID"
echo "REGION     = $REGION"
echo "REPO_DIR   = $REPO_DIR"
echo

echo "==============================="
echo " 0.1 GCLOUD: AUTH Y PROYECTO  "
echo "==============================="

echo "Credentialed Accounts"
gcloud auth list

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud config set run/region "$REGION"   >/dev/null

echo
echo "Proyecto activo:"
gcloud config get-value project
echo

echo "==============================="
echo " 0.2 ESPACIO EN DISCO         "
echo "==============================="

df -h "$HOME"
echo
du -h --max-depth=1 "$HOME" | sort -h
echo

echo "==============================="
echo " 0.3 VERSIONES NODE / NPM     "
echo "==============================="

if command -v node >/dev/null 2>&1; then
  echo -n "node: "
  node -v
else
  echo "⚠️  Node NO está instalado en este entorno (Cloud Shell)."
fi

if command -v npm >/dev/null 2>&1; then
  echo -n "npm : "
  npm -v
else
  echo "⚠️  npm NO está instalado en este entorno."
fi

if command -v pnpm >/dev/null 2>&1; then
  echo -n "pnpm: "
  pnpm -v
else
  echo "ℹ️  pnpm no está instalado (solo relevante si lo quieres usar)."
fi
echo

echo "==============================="
echo " 0.4 SERVICIOS GCP NECESARIOS "
echo "==============================="

echo "Habilitando (o verificando) APIs básicas del proyecto…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  >/dev/null

echo "APIs revisadas."
echo

echo "==============================="
echo " 0.5 ESTADO CLOUD SQL         "
echo "==============================="

echo "Listado de instancias Cloud SQL en el proyecto:"
gcloud sql instances list || echo "ℹ️  No hay instancias SQL o no hay permisos."
echo
echo "ℹ️  NOTA: aquí solo miramos qué instancias existen."
echo "    La creación de instancias, BBDD y tablas se hará MÁS ADELANTE."
echo

echo "==============================="
echo " 0.6 ESTADO DEL MONOREPO      "
echo "==============================="

if [ -d "$REPO_DIR" ]; then
  echo "✅ Carpeta $REPO_DIR ya existe."
  cd "$REPO_DIR"

  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "✅ El directorio es un repositorio Git."
    echo
    echo "Remotos configurados:"
    git remote -v || true
    echo

    echo "Rama actual y últimos commits:"
    git status -sb || true
    git log --oneline -n 5 || true
    echo

    echo "Estructura de apps (si existe):"
    if [ -d "apps" ]; then
      echo "apps:"
      ls apps
      echo
      [ -d "apps/api" ] && echo "apps/api:" && ls apps/api && echo
      [ -d "apps/app" ] && echo "apps/app:" && ls apps/app && echo
      [ -d "apps/landing" ] && echo "apps/landing:" && ls apps/landing && echo
    else
      echo "⚠️  No existe carpeta apps/ en el monorepo."
    fi

  else
    echo "⚠️  $REPO_DIR existe pero NO es un repositorio Git."
  fi
else
  echo "⚠️  Carpeta $REPO_DIR NO existe todavía."
  echo "    Se creará/clonará en el Paso 1 (no en este script)."
fi
echo

echo "==============================="
echo " 0.7 IDENTIDAD GIT LOCAL      "
echo "==============================="

GIT_NAME=$(git config --global user.name || true)
GIT_EMAIL=$(git config --global user.email || true)

if [ -z "$GIT_NAME" ] || [ -z "$GIT_EMAIL" ]; then
  echo "⚠️ No hay identidad Git global configurada."
  echo "   Te recomiendo (una vez) ejecutar:"
  echo
  echo '   git config --global user.name  "Soporte Verifactu"'
  echo '   git config --global user.email "soporte@verifactu.business"'
else
  echo "Identidad Git global:"
  echo "  user.name  = $GIT_NAME"
  echo "  user.email = $GIT_EMAIL"
fi
echo

echo "==============================="
echo " 0.8 CLAVES SSH (si usas git@github)"
echo "==============================="

KEY_PATH="$HOME/.ssh/id_ed25519_verifactu.pub"
if [ -f "$KEY_PATH" ]; then
  echo "✅ Clave SSH específica encontrada: $KEY_PATH"
  echo "Contenido (para comprobar con GitHub):"
  cat "$KEY_PATH"
else
  echo "⚠️ No se ha encontrado $KEY_PATH"
  echo "   Si el remoto de GitHub usa 'git@github.com:...'"
  echo "   en el Paso 1 tendrás que generar una clave nueva y añadirla a GitHub."
fi
echo

echo "==============================="
echo " 0.9 RESUMEN                  "
echo "==============================="
echo "✔ Se ha comprobado:"
echo "  - Proyecto y región activos en gcloud"
echo "  - Espacio en disco en \$HOME"
echo "  - Presencia (o no) de Node/npm/pnpm"
echo "  - APIs esenciales habilitadas (Run, Build, SQL, Secret Manager)"
echo "  - Instancias Cloud SQL existentes (solo lectura)"
echo "  - Estado del directorio del monorepo y de Git"
echo "  - Identidad Git global y claves SSH"
echo
echo "⛔ NO se ha clonado nada, NO se ha creado Base de Datos, ni tablas, ni se ha desplegado."
echo "   Cuando confirmes que todo esto está correcto, podrás pasar al Paso 1 (clonado / integración)."
