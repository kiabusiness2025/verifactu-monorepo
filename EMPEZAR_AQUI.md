# ✅ Despliegue Completo - Listo para Usar

## 🎉 ¡Todo está configurado!

Tu monorepo Verifactu ya está completamente preparado para desplegarse en Google Cloud Platform.

## 🚀 Cómo Empezar (3 Opciones)

### Opción 1: Despliegue Rápido (Recomendado) ⚡

```bash
# Configurar variables de entorno
export PROJECT_ID="verifactu-business-480212"
export REGION="europe-west1"

# Ejecutar el script interactivo
./scripts/deploy.sh
```

El script te preguntará qué servicios deseas desplegar.

### Opción 2: Despliegue Manual Completo 🔧

```bash
# Configurar proyecto
gcloud config set project verifactu-business-480212

# Crear secreto de base de datos (solo primera vez)
echo -n "postgres://USER:PASSWORD@HOST:5432/DATABASE" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Desplegar todos los servicios
gcloud builds submit --config=cloudbuild.yaml
```

### Opción 3: CI/CD Automático 🤖

```bash
# Configurar una sola vez
./scripts/setup-cicd.sh

# Después, cada push a 'main' despliega automáticamente
git push origin main
```

## 📦 Servicios Incluidos

| Servicio | Descripción | URL Final |
|----------|-------------|-----------|
| **verifactu-landing** | Página de aterrizaje | `https://verifactu-landing-*.run.app` |
| **verifactu-app** | Aplicación principal | `https://verifactu-app-*.run.app` |
| **verifactu-api** | API backend | `https://verifactu-api-*.run.app` |

## 🔐 Configuración de Secretos

Antes del primer despliegue, crea el secreto de base de datos:

```bash
# Reemplaza con tus credenciales reales
echo -n "postgres://verifactu_user:PASSWORD@146.148.21.12:5432/verifactu_business" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Dar permisos
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:verifactu-business-480212@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 📊 Verificar el Estado

```bash
# Ver estado de todos los servicios
./scripts/check-status.sh

# Ver servicios desplegados
gcloud run services list --region=europe-west1

# Ver URLs de los servicios
gcloud run services list --region=europe-west1 \
  --format="table(metadata.name,status.url)"
```

## 📚 Documentación Disponible

- **[QUICKSTART.md](./QUICKSTART.md)** - Inicio rápido en 3 pasos
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía completa de despliegue
- **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - Resumen técnico y arquitectura
- **[README.md](./README.md)** - Documentación general del proyecto

## 🛠️ Scripts Disponibles

| Script | Propósito |
|--------|-----------|
| `scripts/deploy.sh` | Despliegue interactivo con menú |
| `scripts/setup-cicd.sh` | Configurar CI/CD automático |
| `scripts/check-status.sh` | Verificar estado de servicios |
| `0_precheck_env.sh` | Verificar entorno antes de desplegar |

## ✨ Características

- ✅ Dockerfiles multi-stage optimizados
- ✅ Construcción paralela en Cloud Build
- ✅ Despliegue automático a Cloud Run
- ✅ Gestión segura de secretos
- ✅ HTTPS automático
- ✅ Auto-escalado
- ✅ Monitorización integrada
- ✅ Logs centralizados

## 🆘 Solución de Problemas

### Error: Secreto no encontrado

```bash
# Verificar que existe
gcloud secrets list

# Crearlo si no existe
echo -n "valor" | gcloud secrets create DATABASE_URL --data-file=-
```

### Error: Permisos insuficientes

```bash
# Dar permisos a la cuenta de servicio
gcloud projects add-iam-policy-binding verifactu-business-480212 \
  --member="serviceAccount:verifactu-business-480212@appspot.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Ver logs de errores

```bash
# Logs de un servicio específico
gcloud run services logs read verifactu-app --region=europe-west1 --limit=50

# Logs en tiempo real
gcloud run services logs tail verifactu-api --region=europe-west1
```

## 🎯 Próximos Pasos Recomendados

1. **Desplegar servicios inicialmente** ← Empieza aquí
2. Configurar dominios personalizados
3. Configurar alertas de monitorización
4. Implementar health checks personalizados
5. Optimizar recursos según uso real

## 💡 Consejos

- **Desarrollo**: Usa `./scripts/deploy.sh` para despliegues manuales
- **Producción**: Configura CI/CD con `./scripts/setup-cicd.sh`
- **Monitoreo**: Ejecuta `./scripts/check-status.sh` regularmente
- **Logs**: Revisa logs en Cloud Console para debugging

## 📞 Ayuda

Si necesitas ayuda adicional:

1. Revisa [DEPLOYMENT.md](./DEPLOYMENT.md) para guía detallada
2. Ejecuta `./scripts/check-status.sh` para diagnóstico
3. Revisa logs: `gcloud run services logs read [servicio]`
4. Consulta la [documentación de Cloud Run](https://cloud.google.com/run/docs)

---

**Proyecto**: verifactu-business-480212  
**Región**: europe-west1  
**Estado**: ✅ Listo para desplegar

¡Todo configurado y listo para usar! 🚀
