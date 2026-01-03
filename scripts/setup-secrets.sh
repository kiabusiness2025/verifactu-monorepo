#!/bin/bash
# Script auxiliar para gestionar secrets en Secret Manager
# Uso: ./scripts/setup-secrets.sh

set -e

PROJECT_ID="verifactu-business"
REGION="europe-west1"

echo "=========================================="
echo "Setup Secrets en Google Secret Manager"
echo "=========================================="

# Lista de secrets requeridos
SECRETS=(
  "isaak-api-key"
  "isaak-assistant-id"
  "stripe-secret-key"
)

echo ""
echo "📋 Verificando/creando secrets..."

for SECRET_NAME in "${SECRETS[@]}"; do
  echo ""
  echo "Verificando: ${SECRET_NAME}"
  
  if gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} > /dev/null 2>&1; then
    echo "  ✅ Secret existe"
  else
    echo "  ⚠️  Secret no existe. Creando..."
    # Crear secret vacío (después rellenar manualmente)
    echo "PLACEHOLDER_VALUE" | gcloud secrets create ${SECRET_NAME} \
      --project=${PROJECT_ID} \
      --replication-policy="automatic" \
      --data-file=-
    echo "  ✅ Secret creado (ACTUALIZAR CON VALORES REALES)"
  fi
done

echo ""
echo "=========================================="
echo "⚠️  PRÓXIMO PASO: Actualizar valores de secrets"
echo "=========================================="
echo ""
echo "Para cada secret, ejecutar:"
echo "  gcloud secrets versions add <secret-name> --data-file=- < valor.txt"
echo ""
echo "O editar manualmente:"
echo "  gcloud secrets versions list <secret-name>"
echo ""

