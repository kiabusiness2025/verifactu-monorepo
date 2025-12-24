#!/usr/bin/env bash
set -e

# Script de despliegue para Verifactu Monorepo en Google Cloud Platform
# Este script despliega los tres servicios (landing, app, api) a Cloud Run

echo "========================================"
echo " DESPLIEGUE VERIFACTU A GOOGLE CLOUD   "
echo "========================================"
echo

# Variables de configuración
PROJECT_ID="${PROJECT_ID:-verifactu-business-480212}"
REGION="${REGION:-europe-west1}"

echo "Configuración:"
echo "  PROJECT_ID: $PROJECT_ID"
echo "  REGION:     $REGION"
echo

# Verificar que gcloud esté configurado
echo "Verificando configuración de gcloud..."
if ! gcloud auth list 2>&1 | grep -q "ACTIVE"; then
  echo "❌ Error: No hay una cuenta activa en gcloud. Ejecuta 'gcloud auth login' primero."
  exit 1
fi

# Configurar proyecto y región
gcloud config set project "$PROJECT_ID" 2>/dev/null
gcloud config set run/region "$REGION" 2>/dev/null

echo "✅ Configuración de gcloud completada"
echo

# Función para desplegar un servicio
deploy_service() {
  local service_name=$1
  local service_path=$2
  local dockerfile=$3
  local needs_db=$4
  
  echo "----------------------------------------"
  echo "Desplegando: $service_name"
  echo "----------------------------------------"
  
  # Construir argumentos base
  local deploy_args=(
    "run" "deploy" "$service_name"
    "--source=$service_path"
    "--region=$REGION"
    "--allow-unauthenticated"
    "--platform=managed"
    "--port=8080"
  )
  
  # Agregar secretos si se necesita base de datos
  if [ "$needs_db" = "true" ]; then
    deploy_args+=("--set-secrets=DATABASE_URL=DATABASE_URL:latest")
  fi
  
  echo "Ejecutando: gcloud ${deploy_args[*]}"
  echo
  
  if gcloud "${deploy_args[@]}"; then
    echo "✅ $service_name desplegado exitosamente"
  else
    echo "❌ Error al desplegar $service_name"
    return 1
  fi
  
  echo
}

# Preguntar qué servicios desplegar
echo "¿Qué servicios deseas desplegar?"
echo "  1) Todos los servicios"
echo "  2) Solo landing"
echo "  3) Solo app"
echo "  4) Solo api"
echo "  5) Landing + App"
echo "  6) Cancelar"
echo
read -p "Selecciona una opción (1-6): " option

case $option in
  1)
    echo "Desplegando todos los servicios..."
    deploy_service "verifactu-landing" "apps/landing" "apps/landing/Dockerfile" "false"
    deploy_service "verifactu-app" "apps/app" "apps/app/Dockerfile" "true"
    deploy_service "verifactu-api" "apps/api" "apps/api/Dockerfile" "true"
    ;;
  2)
    echo "Desplegando solo landing..."
    deploy_service "verifactu-landing" "apps/landing" "apps/landing/Dockerfile" "false"
    ;;
  3)
    echo "Desplegando solo app..."
    deploy_service "verifactu-app" "apps/app" "apps/app/Dockerfile" "true"
    ;;
  4)
    echo "Desplegando solo api..."
    deploy_service "verifactu-api" "apps/api" "apps/api/Dockerfile" "true"
    ;;
  5)
    echo "Desplegando landing y app..."
    deploy_service "verifactu-landing" "apps/landing" "apps/landing/Dockerfile" "false"
    deploy_service "verifactu-app" "apps/app" "apps/app/Dockerfile" "true"
    ;;
  6)
    echo "Despliegue cancelado."
    exit 0
    ;;
  *)
    echo "❌ Opción inválida."
    exit 1
    ;;
esac

echo
echo "========================================"
echo " RESUMEN DE DESPLIEGUE                  "
echo "========================================"
echo
echo "Para ver los servicios desplegados:"
echo "  gcloud run services list --region=$REGION"
echo
echo "Para ver los logs de un servicio:"
echo "  gcloud run services logs read [SERVICE_NAME] --region=$REGION"
echo
echo "Para ver las URLs de los servicios:"
gcloud run services list --platform=managed --region=$REGION --format="table(metadata.name,status.url)"
echo
echo "✅ Despliegue completado"
