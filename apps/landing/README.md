# VeriFactu Business — Landing Pública

Landing oficial de **verifactu.business**, desplegada en **Vercel** y construida con **Next.js (App Router)**.

## Posicion dentro del monorepo

Este proyecto es solo el proyecto publico 1 de 3:

- `verifactu.business` -> `apps/landing`
- `holded.verifactu.business` -> `apps/holded`
- `isaak.verifactu.business` -> `apps/isaak`

Comparten backend y datos cuando corresponde, pero son experiencias publicas separadas y no deben mezclarse en branding, URLs ni documentacion operativa.

## Regla de aislamiento (obligatoria)

- `apps/landing` solo sirve `verifactu.business`.
- El dominio `holded.verifactu.business` pertenece solo a `apps/holded`.
- El dominio `isaak.verifactu.business` pertenece solo a `apps/isaak`.
- En este proyecto, el remitente de Resend debe ser solo `@verifactu.business`.
- No reutilizar en landing variables de dominio/correo propias de Holded o Isaak.

La landing es **independiente del resto del monorepo** y está diseñada para:

- Conversión (CTA + pricing dinámico)
- Captura de leads (email vía Resend)
- Chat inteligente "Isaak" (OpenAI)
- Despliegue automático en Vercel

### Isaak en Landing (2026)

- Mensajes proactivos por sección (`home`, `verifactu`, `producto`, `recursos`, `precios`).
- Selector de personalidad en primera interacción:
  - `Amigable`
  - `Profesional`
  - `Directo`
- Persistencia en landing pública: `localStorage` (sin requerir sesión).

## Documentación funcional 2026

- Guía integral de coherencia de web y conversión:
  - `LANDING_VERIFACTU_BUSINESS_2026.md`

---

## 🌍 Producción

- **Dominio:** https://verifactu.business
- **Tipo de proyecto:** Proyecto publico 1 de 3
- **Plataforma:** Vercel
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
│       └── chat/route.ts         # Chat IA → OpenAI
│
├── public/
│   └── assets/              # Logos, iconos
│
├── next.config.js           # output: "standalone"
├── package.json
└── README.md
```

---

## ⚙️ Requisitos

- Node.js **20+**
- npm
- Acceso al proyecto de Vercel

---

## 🔐 Variables de entorno

### 1) Leads (Resend)

Usado por `POST /api/send-lead` para enviar correos al equipo.

**Variables requeridas:**

```
RESEND_API_KEY
```

---

### 2) Chat IA (OpenAI)

Usado por `POST /api/chat`.

**Variables requeridas:**

```
ISAAK_NEW_OPENAI_API_KEY      # clave de API de OpenAI
ISAAK_OPENAI_MODEL            # opcional, por defecto: gpt-4.1-mini
```

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

### `POST /api/chat`

Chat con el asistente Isaak (OpenAI Responses API).

**Body JSON:**

```json
{
  "message": "Texto del usuario"
}
```

**Respuesta:**

- `200` → `{ response: "respuesta IA" }`
- `400` / `500` → error de configuración o OpenAI

---

## 🚀 Deploy en Vercel

El despliegue activo se hace desde el proyecto de Vercel conectado al monorepo.

Flujo esperado:

1. Push a `main`
2. Vercel detecta cambios en `apps/landing`
3. Build y deploy automáticos sobre `verifactu.business`

Si necesitas forzar un redeploy, hazlo desde el dashboard del proyecto en Vercel.

---

## 🌐 Dominio

El dominio `verifactu.business` se gestiona desde Vercel.

---

## 🛠️ Troubleshooting

### La build falla con `.next/standalone`

Verifica que `next.config.js` contiene:

```js
output: 'standalone';
```

---

### No llegan emails de leads

- Verifica `RESEND_API_KEY` en Vercel
- Revisa los logs de funciones del proyecto en Vercel

---

### El chat IA no responde

- Revisa `ISAAK_NEW_OPENAI_API_KEY`
- Si quieres fijar modelo, define `ISAAK_OPENAI_MODEL`
- Revisa los logs de funciones del proyecto en Vercel

---

## 🧠 Filosofía de la landing

- **Independiente del core de la app**
- Auth opcional para redirección de sesión
- Stripe solo para checkout de la landing
- Sin persistencia de preferencias de Isaak en backend (visitante anónimo)
- Optimizada para velocidad, SEO y conversión
- Toda la lógica sensible vive en server routes

---

## ✍️ Cambios habituales

- **UI / copy:** `app/page.tsx`, `globals.css`
- **Logos / iconos:** `public/assets`
- **Emails / leads:** `app/api/send-lead`
- **IA / chat:** `app/api/chat`
