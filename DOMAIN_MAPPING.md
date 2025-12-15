# Guía de Mapeo de Dominio para Cloud Run

Esta guía te ayudará a mapear el dominio `verifactu.business` a tus servicios de Google Cloud Run.

## Prerequisitos

- Proyecto de Google Cloud configurado (`just-turbine-478910-b7`)
- Servicios desplegados en Cloud Run:
  - `verifactu-landing` (aplicación principal)
  - `verifactu-app` (aplicación interna)
- Acceso al panel de control de tu registrador de dominios (donde compraste verifactu.business)

## Paso 1: Verificar la Propiedad del Dominio

Primero, debes verificar que eres propietario del dominio en Google Cloud:

```bash
# 1. Añadir el dominio a Google Cloud Console
gcloud domains verify verifactu.business
```

**Método alternativo (más común):**

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Añade `verifactu.business` como propiedad
3. Verifica usando uno de estos métodos:
   - **HTML file upload**: Sube un archivo HTML a tu hosting actual
   - **HTML tag**: Añade una meta tag a tu página principal
   - **Google Analytics**: Si ya tienes GA instalado
   - **DNS TXT record**: Añade un registro TXT a tu DNS (recomendado)

### Verificación DNS (Recomendado)

Añade este registro TXT a tu DNS:

```
Nombre: @
Tipo: TXT
Valor: google-site-verification=XXXXXX (Google te dará este valor)
TTL: 3600
```

## Paso 2: Configurar Cloud Run para Dominios Personalizados

### Opción A: Mapeo para verifactu-landing (Dominio Principal)

```bash
# 1. Mapear el dominio principal
gcloud run services add-iam-policy-binding verifactu-landing \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region=europe-west1

# 2. Crear el mapeo de dominio
gcloud beta run domain-mappings create \
  --service verifactu-landing \
  --domain verifactu.business \
  --region=europe-west1
```

### Opción B: Mapeo con Subdominios

Si quieres usar subdominios para diferentes servicios:

```bash
# Landing en el dominio principal
gcloud beta run domain-mappings create \
  --service verifactu-landing \
  --domain verifactu.business \
  --region=europe-west1

# App en un subdominio
gcloud beta run domain-mappings create \
  --service verifactu-app \
  --domain app.verifactu.business \
  --region=europe-west1

# API en otro subdominio (si lo necesitas)
gcloud beta run domain-mappings create \
  --service verifactu-api \
  --domain api.verifactu.business \
  --region=europe-west1
```

## Paso 3: Obtener Registros DNS Necesarios

Después de crear el mapeo, Cloud Run te proporcionará los registros DNS necesarios:

```bash
# Ver los detalles del mapeo
gcloud beta run domain-mappings describe verifactu.business \
  --region=europe-west1
```

La salida incluirá algo como:

```yaml
resourceRecords:
- name: verifactu.business
  rrdata: ghs.googlehosted.com.
  type: CNAME
- name: verifactu.business
  rrdata: 216.239.32.21, 216.239.34.21, 216.239.36.21, 216.239.38.21
  type: A
```

## Paso 4: Configurar DNS en tu Registrador

Ve al panel de control de tu registrador de dominios y añade estos registros:

### Para el dominio raíz (verifactu.business):

**Opción A: Usando registros A (Recomendado para dominios raíz)**

```
Nombre: @
Tipo: A
Valor: 216.239.32.21
TTL: 3600

Nombre: @
Tipo: A
Valor: 216.239.34.21
TTL: 3600

Nombre: @
Tipo: A
Valor: 216.239.36.21
TTL: 3600

Nombre: @
Tipo: A
Valor: 216.239.38.21
TTL: 3600
```

**Opción B: Usando CNAME (solo si tu registrador lo permite para dominio raíz)**

```
Nombre: @
Tipo: CNAME
Valor: ghs.googlehosted.com
TTL: 3600
```

### Para subdominios (ej: app.verifactu.business):

```
Nombre: app
Tipo: CNAME
Valor: ghs.googlehosted.com
TTL: 3600
```

### Para www (www.verifactu.business):

```
Nombre: www
Tipo: CNAME
Valor: ghs.googlehosted.com
TTL: 3600
```

## Paso 5: Configurar Redirección de www a dominio raíz (Opcional)

Si quieres que `www.verifactu.business` redirija a `verifactu.business`:

1. **Opción 1**: Configura la redirección en tu registrador (si tiene esta función)
2. **Opción 2**: Crea un servicio Cloud Run simple que redirija:

```bash
# Desplegar servicio de redirección
gcloud run deploy www-redirect \
  --image=gcr.io/cloud-marketplace/google/nginx1:latest \
  --platform=managed \
  --region=europe-west1 \
  --allow-unauthenticated

# Mapear www al servicio de redirección
gcloud beta run domain-mappings create \
  --service www-redirect \
  --domain www.verifactu.business \
  --region=europe-west1
```

## Paso 6: Actualizar Variables de Entorno

Actualiza `NEXTAUTH_URL` en tus servicios:

```bash
# Para verifactu-landing
gcloud run services update verifactu-landing \
  --update-env-vars NEXTAUTH_URL=https://verifactu.business \
  --region=europe-west1

# Para verifactu-app (si usa autenticación)
gcloud run services update verifactu-app \
  --update-env-vars NEXTAUTH_URL=https://app.verifactu.business \
  --region=europe-west1
```

También actualiza en Secret Manager o tus archivos de configuración.

## Paso 7: Actualizar Google OAuth URLs Autorizadas

Ve a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=just-turbine-478910-b7) y actualiza:

### Orígenes de JavaScript autorizados:
- `https://verifactu.business`
- `https://www.verifactu.business` (si usas www)
- `https://app.verifactu.business` (si usas este subdominio)

### URIs de redireccionamiento autorizados:
- `https://verifactu.business/api/auth/callback/google`
- `https://www.verifactu.business/api/auth/callback/google`
- `https://app.verifactu.business/api/auth/callback/google`

## Paso 8: Verificar el Certificado SSL

Cloud Run automáticamente provisiona certificados SSL para dominios personalizados. Esto puede tardar entre 15 minutos y 24 horas.

Verificar el estado:

```bash
# Ver el estado del mapeo
gcloud beta run domain-mappings describe verifactu.business \
  --region=europe-west1
```

Busca:
```yaml
status:
  conditions:
  - status: "True"
    type: Ready
  - status: "True"
    type: CertificateProvisioned
```

## Paso 9: Probar el Dominio

Una vez que el DNS se propague (puede tardar entre 5 minutos y 48 horas):

```bash
# Probar resolución DNS
nslookup verifactu.business
dig verifactu.business

# Probar conectividad HTTPS
curl -I https://verifactu.business

# Probar en el navegador
# Abre https://verifactu.business
```

## Comandos Útiles de Troubleshooting

```bash
# Listar todos los mapeos de dominio
gcloud beta run domain-mappings list --region=europe-west1

# Ver detalles de un mapeo específico
gcloud beta run domain-mappings describe verifactu.business --region=europe-west1

# Eliminar un mapeo (si necesitas empezar de nuevo)
gcloud beta run domain-mappings delete verifactu.business --region=europe-west1

# Ver logs del servicio
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=verifactu-landing" \
  --limit 50 \
  --format json
```

## Configuración DNS Completa Recomendada

Aquí está la configuración DNS completa que deberías tener:

```dns
# Dominio principal apuntando a Cloud Run
@           A       216.239.32.21     3600
@           A       216.239.34.21     3600
@           A       216.239.36.21     3600
@           A       216.239.38.21     3600

# WWW apuntando a Cloud Run
www         CNAME   ghs.googlehosted.com.     3600

# Subdominio para app
app         CNAME   ghs.googlehosted.com.     3600

# Verificación de Google (del Paso 1)
@           TXT     "google-site-verification=XXXXXX"     3600

# Email (si usas Google Workspace o similar)
@           MX      1 aspmx.l.google.com.     3600
@           MX      5 alt1.aspmx.l.google.com.     3600

# SPF para email (si envías emails)
@           TXT     "v=spf1 include:_spf.google.com ~all"     3600
```

## Checklist de Configuración

- [ ] Dominio verificado en Google Search Console
- [ ] Servicios de Cloud Run desplegados y funcionando
- [ ] Mapeo de dominio creado en Cloud Run
- [ ] Registros DNS configurados en el registrador
- [ ] Variables de entorno NEXTAUTH_URL actualizadas
- [ ] Google OAuth URLs actualizadas
- [ ] Certificado SSL provisionado (puede tardar hasta 24h)
- [ ] DNS propagado (verifica con nslookup/dig)
- [ ] Sitio accesible vía HTTPS
- [ ] Redirección de www configurada (opcional)
- [ ] Pruebas de autenticación funcionando

## Problemas Comunes y Soluciones

### 1. "Certificate provisioning failed"
- Verifica que la verificación del dominio esté completa
- Asegúrate de que los registros DNS estén correctos
- Espera 24 horas para la propagación DNS completa

### 2. "Domain mapping not found"
- Verifica que hayas usado `--region=europe-west1` (la misma región que tu servicio)
- Confirma que el servicio existe: `gcloud run services list`

### 3. "Forbidden" o "404"
- Verifica que el servicio tenga el permiso `allUsers` con rol `run.invoker`
- Confirma que NEXTAUTH_URL esté correctamente configurado

### 4. OAuth no funciona
- Actualiza las URLs en Google Cloud Console Credentials
- Verifica que `NEXTAUTH_URL` coincida exactamente con tu dominio (incluyendo https://)
- Regenera el `NEXTAUTH_SECRET` si es necesario

### 5. DNS no se propaga
- Espera hasta 48 horas para propagación completa
- Usa herramientas online como https://dnschecker.org
- Limpia la caché DNS local: `ipconfig /flushdns` (Windows) o `sudo dscacheutil -flushcache` (Mac)

## Monitoreo y Logs

```bash
# Ver logs en tiempo real
gcloud run services logs tail verifactu-landing --region=europe-west1

# Ver métricas
gcloud monitoring dashboards list

# Configurar alertas
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Cloud Run High Error Rate" \
  --condition-threshold-value=0.05
```

## Recursos Adicionales

- [Cloud Run Domain Mapping](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Google Search Console](https://search.google.com/search-console)
- [DNS Propagation Checker](https://dnschecker.org)
- [SSL Certificate Checker](https://www.sslshopper.com/ssl-checker.html)

## Soporte

Si encuentras problemas:
1. Revisa los logs: `gcloud run services logs read verifactu-landing`
2. Verifica el estado del servicio: `gcloud run services describe verifactu-landing`
3. Consulta la documentación oficial de Google Cloud
4. Contacta al soporte de Google Cloud si es necesario
