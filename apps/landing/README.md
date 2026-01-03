# VeriFactu Business — Landing Pública

Landing oficial de **verifactu.business**, desplegada en **Google Cloud Run** (región `europe-west1`) y construida con **Next.js (App Router)**.

La landing es **independiente del resto del monorepo** y está diseñada para:
- Conversión (CTA + pricing dinámico)
- Captura de leads (email vía Resend)
- Chat inteligente "Isaak" (Vertex AI / Gemini)
- Despliegue estable y reproducible en Cloud Run

---

## 🌍 Producción

- **Dominio:** https://verifactu.business  
- **Servicio Cloud Run:** `verifactu-landing`  
- **Región:** `europe-west1`  
- **Autenticación:** pública (allow unauthenticated)

---

## 📁 Estructura

```
apps/landing/
├── app/
│   ├── page.tsx             # Landing principal
│   ├── layout.tsx           # Layout global
│   ├── globals.css          # Estilos
│   └── api/
│       ├── send-lead/route.ts    # Lead → email (Resend)
│       └── vertex-chat/route.ts  # Chat IA → Vertex AI
│
├── public/
│   └── assets/              # Logos, iconos
│
├── Dockerfile               # Imagen Cloud Run (Next standalone)
├── next.config.js           # output: "standalone"
├── package.json
└── README.md
```

---

## ⚙️ Requisitos

- Node.js **20+**
- npm
- Acceso a Google Cloud (para deploy)
- Cloud Run habilitado en el proyecto

---

## 🔐 Variables de entorno

### 1) Leads (Resend)

Usado por `POST /api/send-lead` para enviar correos al equipo.

**Variables requeridas:**

```
RESEND_API_KEY
```

---

### 2) Chat IA (Vertex AI)

Usado por `POST /api/vertex-chat`.

**Variables requeridas:**

```
VERTEX_PROJECT_ID  # o GOOGLE_CLOUD_PROJECT
VERTEX_LOCATION    # por defecto: europe-west1 o us-central1
VERTEX_MODEL_ID    # por defecto: gemini-1.5-pro
```

> ℹ️ En Cloud Run, `GOOGLE_CLOUD_PROJECT` suele existir automáticamente.  
> Aun así, se recomienda definir explícitamente `VERTEX_PROJECT_ID`.

---

## 🧪 Desarrollo local

Desde la **raíz del monorepo**:

```bash
cd apps/landing
npm ci
npm run dev
```

Abrir:

```
http://localhost:3000
```

---

## 🏗️ Build local (validación)

```bash
cd apps/landing
npm run build
npm run start
```

---

## 🔌 Endpoints disponibles

### `POST /api/send-lead`

Envía un email al equipo con la solicitud del usuario.

**Body JSON:**

```json
{
  "name": "Nombre",
  "email": "email@dominio.com",
  "company": "Empresa (opcional)",
  "message": "Mensaje (opcional)",
  "interest": "register | login | demo | trial"
}
```

**Respuesta:**

- `200` → `{ ok: true }`
- `400` → datos obligatorios faltantes
- `502` → error en Resend

---

### `POST /api/vertex-chat`

Chat con el asistente Isaak (Vertex AI).

**Body JSON:**

```json
{
  "message": "Texto del usuario"
}
```

**Respuesta:**

- `200` → `{ ok: true, text: "respuesta IA" }`
- `400` / `500` → error de configuración o Vertex

---

## 🚀 Deploy a Cloud Run (RECOMENDADO)

El despliegue se hace desde la raíz del repo usando Cloud Build.

### Deploy estándar

```bash
gcloud config set project verifactu-business-480212
gcloud builds submit --config cloudbuild.yaml .
```

Este comando:

1. Construye solo `apps/landing`
2. Publica la imagen `verifactu-landing`
3. Despliega en Cloud Run (`europe-west1`)
4. Mantiene el dominio `verifactu.business`

---

## 🌐 Dominio

El dominio está mapeado directamente a Cloud Run.

**Comprobar estado:**

```bash
gcloud run domain-mappings describe verifactu.business --region europe-west1
```

**Si fuera necesario recrearlo:**

```bash
gcloud beta run domain-mappings create \
  --domain verifactu.business \
  --service verifactu-landing \
  --region europe-west1
```

---

## 🛠️ Troubleshooting

### La build falla con `.next/standalone`

Verifica que `next.config.js` contiene:

```js
output: "standalone"
```

---

### No llegan emails de leads

- Verifica `RESEND_API_KEY` en Cloud Run
- Revisa logs:

```bash
gcloud run services logs read verifactu-landing --region europe-west1
```

---

### El chat IA no responde

- Revisa variables `VERTEX_*`
- Verifica permisos del Service Account de Cloud Run para Vertex AI
- Logs:

```bash
gcloud run services logs read verifactu-landing --region europe-west1
```

---

## 🧠 Filosofía de la landing

- **Independiente del core de la app**
- Sin auth
- Sin Stripe
- Sin base de datos
- Optimizada para velocidad, SEO y conversión
- Toda la lógica sensible vive en server routes

---

## ✍️ Cambios habituales

- **UI / copy:** `app/page.tsx`, `globals.css`
- **Logos / iconos:** `public/assets`
- **Emails / leads:** `app/api/send-lead`
- **IA / chat:** `app/api/vertex-chat`
