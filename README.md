# Proyecto Verifactu

Este documento resume la configuración principal de los proyectos, servicios y dominios para la aplicación Verifactu.

## Proyectos en Google Cloud

- **`verifactu-prod`**: Entorno de producción.
- **`verifactu-pre`**: Entorno de pre-producción y pruebas (staging).

## Dominios y Servicios

| Dominio                  | Servicio de Cloud Run    | Descripción                  |
| ------------------------ | ------------------------ | ---------------------------- |
| `verifactu.business`     | `verifactu-landing`      | Landing page pública         |
| `app.verifactu.business` | `verifactu-app-prod`     | Frontend de la aplicación    |
| `api.verifactu.business` | `verifactu-backend-prod` | API de backend para la aplicación |

## Secretos

Los siguientes secretos están gestionados en **Google Secret Manager** dentro del proyecto `verifactu-prod`.

- `AEAT_CERT`: Certificado de la AEAT.
- `AEAT_CERT_PASS`: Contraseña del certificado de la AEAT.
- `AEAT_WSDL_URL`: URL del WSDL de producción de la AEAT.

## Despliegues

### Landing Page

Para desplegar la landing page, desde el directorio `/workspace/landing`:

```bash
gcloud run deploy verifactu-landing --source . --region=europe-west1 --allow-unauthenticated --project=verifactu-prod
```

### Aplicación Frontend

Para desplegar el frontend, desde el directorio `/workspace/app`:

1.  **Construir la imagen:**
    ```bash
    # Reemplazar 'TAG' con una versión, ej: 20251020-123456
    IMG_APP="europe-west1-docker.pkg.dev/verifactu-prod/verifactu-repo/verifactu-app:TAG"
gcloud builds submit --tag "$IMG_APP" --project=verifactu-prod
    ```

2.  **Desplegar la imagen:**
    ```bash
    gcloud run deploy verifactu-app-prod \
      --image "$IMG_APP" \
      --region "europe-west1" \
      --platform managed \
      --allow-unauthenticated \
      --project=verifactu-prod
    ```
