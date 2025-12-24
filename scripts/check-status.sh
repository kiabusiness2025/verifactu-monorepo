#!/usr/bin/env bash
set -e

# Script para verificar el estado de los despliegues en Cloud Run

echo "=========================================="
echo " ESTADO DE SERVICIOS VERIFACTU           "
echo "=========================================="
echo

# Variables de configuración
PROJECT_ID="${PROJECT_ID:-verifactu-business-480212}"
REGION="${REGION:-europe-west1}"

# Configurar proyecto
gcloud config set project "$PROJECT_ID" 2>/dev/null
gcloud config set run/region "$REGION" 2>/dev/null

echo "Proyecto: $PROJECT_ID"
echo "Región:   $REGION"
echo

echo "----------------------------------------"
echo "Servicios en Cloud Run"
echo "----------------------------------------"

# Listar todos los servicios
gcloud run services list \
  --platform=managed \
  --region=$REGION \
  --format="table(
    metadata.name:label=SERVICIO,
    status.url:label=URL,
    status.latestReadyRevisionName:label=REVISION,
    metadata.creationTimestamp.date('%Y-%m-%d %H:%M'):label=CREADO
  )"

echo
echo "----------------------------------------"
echo "Estado de cada servicio"
echo "----------------------------------------"

# Función para verificar un servicio
check_service() {
  local service_name=$1
  echo
  echo "📦 $service_name"
  echo "   ---"
  
  if gcloud run services describe "$service_name" --region=$REGION &>/dev/null; then
    local url=$(gcloud run services describe "$service_name" --region=$REGION --format="value(status.url)")
    local ready=$(gcloud run services describe "$service_name" --region=$REGION --format="value(status.conditions[0].status)")
    
    echo "   URL:    $url"
    echo "   Estado: $ready"
    
    # Verificar si el servicio responde
    if [ -n "$url" ]; then
      http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
      if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
        echo "   Health: ✅ Respondiendo (HTTP $http_code)"
      else
        echo "   Health: ⚠️  No responde o error (HTTP $http_code)"
      fi
    fi
  else
    echo "   ❌ Servicio no encontrado"
  fi
}

# Verificar cada servicio
check_service "verifactu-landing"
check_service "verifactu-app"
check_service "verifactu-api"

echo
echo "----------------------------------------"
echo "Revisiones recientes"
echo "----------------------------------------"

gcloud run revisions list \
  --region=$REGION \
  --limit=10 \
  --format="table(
    metadata.name:label=REVISION,
    metadata.labels.serving.knative.dev/service:label=SERVICIO,
    status.conditions[0].status:label=ESTADO,
    metadata.creationTimestamp.date('%Y-%m-%d %H:%M'):label=CREADO
  )"

echo
echo "----------------------------------------"
echo "Logs recientes (últimas 5 líneas)"
echo "----------------------------------------"

for service in verifactu-landing verifactu-app verifactu-api; do
  if gcloud run services describe "$service" --region=$REGION &>/dev/null; then
    echo
    echo "📋 Logs de $service:"
    gcloud run services logs read "$service" --region=$REGION --limit=5 2>/dev/null | tail -5 || echo "   Sin logs disponibles"
  fi
done

echo
echo "=========================================="
echo " COMANDOS ÚTILES                          "
echo "=========================================="
echo
echo "Ver logs en tiempo real:"
echo "  gcloud run services logs tail [servicio] --region=$REGION"
echo
echo "Ver detalles de un servicio:"
echo "  gcloud run services describe [servicio] --region=$REGION"
echo
echo "Ver tráfico de revisiones:"
echo "  gcloud run services describe [servicio] --region=$REGION --format='value(spec.traffic)'"
echo
echo "Ver métricas en la consola:"
echo "  https://console.cloud.google.com/run?project=$PROJECT_ID"
