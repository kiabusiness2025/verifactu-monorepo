# INSTRUCCIONES MAESTRAS — ADDENDUM Integraciones & Cloud (Isaak v2.1)

## 1) Autenticación (Firebase Auth) — Obligatorio

Implementar registro/inicio de sesión con:
- **Google OAuth**
- **Correo + contraseña**

**UX sin fricción:** "Empezar gratis" → login → dashboard.

**Requisitos técnicos:**
- El backend (Cloud Run) debe validar el ID token emitido por Firebase para autorizar peticiones
- No exponer secretos en cliente
- **Regla:** Auth siempre centralizada en Firebase (no duplicar sistemas de auth)

---

## 2) Datos contables y core del negocio (Google Cloud SQL – PostgreSQL) — Obligatorio

**La fuente de verdad de datos contables/fiscales es PostgreSQL en Cloud SQL.**

Diseñar modelo relacional (clientes, proveedores, facturas, gastos, categorías, impuestos, etc.).

**Incluir:**
- Migraciones
- Backups automáticos
- Auditoría básica (quién, qué, cuándo)

**Nunca usar Firestore como base contable principal.**

**Regla:** Firestore solo para estados ligeros/no críticos (flags, preferencias, estado de chat), si se usa.

---

## 3) Backend y ejecución (Google Cloud Run) — Obligatorio

Toda lógica de negocio se ejecuta en Cloud Run:
- APIs
- Procesos de clasificación/validación
- Generación de informes
- Integraciones

**Prohibido ejecutar procesos "serios" en cliente.**

Diseñar por módulos (facturación hoy, contabilidad completa mañana).

---

## 4) Isaak AI (OpenAI + Vertex AI) — Obligatorio con guardarraíles

**Objetivo:** Isaak orquesta acciones y responde; nunca expone claves.

### Flujo técnico:
1. La UI del usuario llama a tu API (`/api/isaak/...`)
2. La API decide motor:
   - **Auto** (por defecto)
   - OpenAI
   - Vertex AI

### Debe existir:
- Fallback si falla un motor
- Rate limit por IP/usuario
- Logs sin PII sensible
- Políticas de seguridad:
  - No inventar datos
  - Pedir confirmación antes de acciones críticas

**Regla de UX:** No mencionar "OpenAI/Vertex" en copy al usuario final. Solo "Isaak".

---

## 5) Notificaciones y recordatorios (Google Calendar API) — Obligatorio con opt-in

Implementar recordatorios de plazos y eventos mediante Google Calendar API.

### Requisitos:
- **Opt-in:** usuario conecta su calendario
- Crear eventos con:
  - Título claro
  - Fecha/hora
  - Descripción útil (sin datos sensibles en exceso)

**Fallback:** Si el usuario no conecta calendario, ofrecer recordatorios internos (en app).

**Regla:** Calendario es para "recordar", no para almacenar datos contables.

---

## 6) Storage de documentos (Proveedor agnóstico con default Google)

### Estrategia de producto: "Abierto + Camino por defecto"

El sistema debe soportar múltiples proveedores de almacenamiento (diseño por conectores).

**Si el usuario:**
- **Quiere elegir** → se le ofrecen opciones (Google Drive / Microsoft / Dropbox / almacenamiento propio, etc.)
- **Le da igual** → usar Google (por defecto) por integración y por Workspace

### Implementación técnica obligatoria:

Crear una interfaz `StorageConnector` (agnóstica) con acciones mínimas:
- `upload`
- `list`
- `download`
- `delete`
- `metadata`

**Implementar primero con proveedor por defecto:**
- Google Drive o Google Cloud Storage

### Mantener "data portability":
- Exportaciones disponibles
- Nunca bloquear acceso a los documentos por el plan

**Regla:** Evitar lenguaje en la UI tipo "Drive/OCR". El usuario ve "Sube documento / Haz foto".

---

## 7) Principio de datos (muy importante para confianza)

### "Tu contabilidad nunca se pierde."

Aunque el usuario baje de plan o cancele:
- ✅ Acceso a datos siempre
- ✅ Exportación siempre
- ✅ Solo se limitan funciones avanzadas, no el acceso

**Este mensaje debe aparecer:**
- Pricing
- Onboarding (Isaak)
- Dashboard (tooltip/info)

---

## 8) Reglas de implementación (para Isaak)

- ✅ Buscar y reutilizar componentes existentes. No duplicar.
- ✅ Todo cambio por rama + PR, con checklist.
- ✅ Documentar env vars requeridas.
- ✅ No prometer integraciones no implementadas; solo "próximamente".

---

## Resumen de tecnologías

| Componente | Tecnología | Obligatorio |
|------------|------------|-------------|
| Autenticación | Firebase Auth | ✅ |
| Base de datos contable | Cloud SQL (PostgreSQL) | ✅ |
| Backend APIs | Cloud Run | ✅ |
| IA/Asistente | OpenAI + Vertex AI | ✅ |
| Recordatorios | Google Calendar API | ✅ (opt-in) |
| Storage documentos | Google Drive/GCS (default) | ✅ (agnóstico) |
| Estados ligeros | Firestore (opcional) | ⚠️ Solo no-crítico |

---

**Última actualización:** 24 diciembre 2025  
**Versión:** Isaak v2.1
