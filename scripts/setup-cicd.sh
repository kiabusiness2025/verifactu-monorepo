#!/usr/bin/env bash
set -e

# Script para configurar Cloud Build Triggers para despliegues automáticos
# Este script configura triggers que se ejecutan automáticamente cuando se hace push a main

echo "=========================================="
echo " CONFIGURACIÓN DE CLOUD BUILD TRIGGERS    "
echo "=========================================="
echo

# Variables de configuración
PROJECT_ID="${PROJECT_ID:-verifactu-business-480212}"
REGION="${REGION:-europe-west1}"
REPO_OWNER="kiabusiness2025"
REPO_NAME="verifactu-monorepo"

echo "Configuración:"
echo "  PROJECT_ID:  $PROJECT_ID"
echo "  REGION:      $REGION"
echo "  REPO:        $REPO_OWNER/$REPO_NAME"
echo

# Configurar proyecto
gcloud config set project "$PROJECT_ID" 2>/dev/null

echo "----------------------------------------"
echo "Verificando conexión a GitHub..."
echo "----------------------------------------"

# Verificar si ya existe una conexión a GitHub
if gcloud builds triggers list --filter="github.owner=$REPO_OWNER" --format="value(name)" 2>/dev/null | grep -q .; then
  echo "✅ Ya existe una conexión a GitHub configurada"
else
  echo "⚠️  No se encontró una conexión a GitHub"
  echo "   Configura la conexión manualmente en:"
  echo "   https://console.cloud.google.com/cloud-build/triggers/connect?project=$PROJECT_ID"
  echo
  read -p "¿Has configurado la conexión a GitHub? (s/n): " configured
  if [ "$configured" != "s" ]; then
    echo "❌ Por favor configura la conexión a GitHub primero"
    exit 1
  fi
fi

echo
echo "----------------------------------------"
echo "Creando trigger para despliegue en main"
echo "----------------------------------------"

# Crear trigger para despliegue automático en push a main
gcloud builds triggers create github \
  --name="deploy-all-services" \
  --repo-name="$REPO_NAME" \
  --repo-owner="$REPO_OWNER" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Despliega todos los servicios cuando se hace push a main" \
  2>&1 | grep -v "ERROR: (gcloud.builds.triggers.create.github) Resource" || true

echo
echo "----------------------------------------"
echo "Estado de los triggers"
echo "----------------------------------------"

gcloud builds triggers list --format="table(name,github.owner,github.name,github.branch,filename)"

echo
echo "=========================================="
echo " CONFIGURACIÓN COMPLETADA                 "
echo "=========================================="
echo
echo "✅ Triggers configurados correctamente"
echo
echo "Para probar el trigger:"
echo "  1. Haz un commit en la rama main"
echo "  2. Haz push a GitHub"
echo "  3. Observa el despliegue en:"
echo "     https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
echo
echo "Para ejecutar el trigger manualmente:"
echo "  gcloud builds triggers run deploy-all-services --branch=main"
