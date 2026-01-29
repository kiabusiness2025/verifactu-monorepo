
# Admin Panel – Verifactu Business

Panel de administración para gestión de usuarios, empresas, suscripciones y operaciones.

## 🚀 Stack
- Next.js 14 (App Router)
- TypeScript
- Stripe (suscripciones)
- Resend (emails)
- Firebase Auth
- PostgreSQL

## 📁 Estructura
```
apps/admin/
├── app/           # App router y páginas admin
├── components/    # Componentes específicos
├── lib/           # Utilidades
├── public/        # Recursos estáticos
├── .env.local     # Variables de entorno
```

## 🔗 Paquetes Compartidos
- @verifactu/auth
- @verifactu/ui
- @verifactu/integrations

## 🛠️ Scripts útiles
- `pnpm dev` – Desarrollo local
- `pnpm build` – Build producción
- `pnpm lint` – Lint
- `pnpm type-check` – Type check

## ⚡ Primeros pasos
1. Copia `.env.example` a `.env.local` y configura credenciales
2. `pnpm install`
3. `pnpm dev`

---
Actualizado: enero 2026

- ✅ Google OAuth (ya configurado)
- ⚠️ GitHub Personal Access Token (necesario)
- ⚠️ Vercel API Token (necesario)
- ⚠️ eInforma API credentials (si aplica)

### 3. Ejecutar en desarrollo

```bash
pnpm dev
```

El panel estará disponible en: `http://localhost:3003`

### 4. Primer login

1. Visita `http://localhost:3003`
2. Click en "Iniciar sesión con Google"
3. Usa tu cuenta `@verifactu.business`
4. Serás redirigido al dashboard

## 🔑 Autenticación y Permisos

### Sincronización automática Google/Firebase → Prisma

Al iniciar sesión con Google/Firebase:
- Si el usuario no existe en Prisma y el email es admin, se crea automáticamente con rol ADMIN.
- Si el usuario existe y el email es admin, se actualiza el rol a ADMIN si es necesario.
- El acceso admin está garantizado para soporte@verifactu.business y kiabusiness2025@gmail.com.
- El flujo es transparente: solo inicia sesión con Google y tendrás acceso admin si tu email está autorizado.

**Configuración en `.env.local`:**

```bash
ADMIN_ALLOWED_EMAIL="support@verifactu.business"
ADMIN_ALLOWED_DOMAIN="verifactu.business"
```

Ver guía completa: [MIDDLEWARE_RBAC.md](./docs/MIDDLEWARE_RBAC.md)

### Roles

| Rol       | Descripción     | Permisos                                               |
| --------- | --------------- | ------------------------------------------------------ |
| `ADMIN`   | Acceso total    | Todos los módulos, impersonación sin límites           |
| `SUPPORT` | Soporte técnico | Ver datos, impersonación limitada según `supportScope` |
| `USER`    | Cliente         | Sin acceso al admin panel (bloqueado por middleware)   |

### Support Scope

Los usuarios `SUPPORT` tienen permisos granulares definidos en `User.supportScope`:

```typescript
{
  canViewDocuments: boolean;
  canEmitInvoices: boolean;
  canModifySettings: boolean;
  canAccessBilling: boolean;
  canDeleteData: boolean;
}
```

### Modo Impersonación

Permite actuar como un usuario/empresa para soporte:

- Banner rojo visible: "⚠️ Modo Soporte - Impersonando [Usuario]"
- Logs de auditoría automáticos
- Limitado por `supportScope`
- Finalización manual obligatoria

## 📊 Módulos Principales

### 1. Overview (Dashboard)

- KPIs: usuarios activos, MRR, conversión
- Incidencias recientes
- Pagos fallidos
- Estado de webhooks

### 2. Users (Usuarios)

- Listado con búsqueda y filtros
- Ver perfil + empresas asociadas
- Resetear flags / bloquear usuario
- Export CSV

### 3. Companies (Empresas)

- Todas las empresas del sistema
- Estado de integraciones (AEAT, bancos, Drive)
- Panel de "salud" (errores, tokens caducados)
- Modo impersonación

### 4. Billing (Facturación)

- Vista de clientes Stripe
- Planes, suscripciones, facturas
- Pagos fallidos
- Customer Portal links
- Webhooks monitor

### 5. Operations (Operaciones)

- Webhooks fallidos
- Logs de errores AEAT
- Monitor de integraciones
- Reintentos manuales

### 6. eInforma

- Búsqueda de empresas (CIF/nombre)
- Solicitar informes
- Control de costes
- Historial de consultas

### 7. Email (Resend)

- Emails enviados/fallos/rebotes
- Reintentos manuales
- Plantillas
- Deliverability stats

### 8. Deployments

- Estado de deploys (Vercel)
- GitHub Actions status
- Enlaces a PRs y commits
- Alertas de fallos

### 9. Audit Log

- Todas las acciones de ADMIN/SUPPORT
- Filtros por usuario, acción, fecha
- Trazabilidad completa
- Export para compliance

## 🔒 Seguridad

### 3 Capas de Protección

1. **OAuth** - Solo `@verifactu.business` puede autenticarse
2. **Middleware** - Toda ruta `/dashboard/*` requiere role `SUPPORT` o `ADMIN`
3. **API Guards** - Cada endpoint verifica permisos

### Auditoría Obligatoria

Toda acción sensible se registra en `AuditLog`:

```typescript
{
  actorUserId: string;      // Quien hace la acción
  targetUserId?: string;    // Sobre quien actúa
  targetCompanyId?: string; // Sobre qué empresa
  action: string;           // Qué hizo
  metadata: JSON;           // Detalles
  timestamp: Date;
  ip: string;
  userAgent: string;
}
```

### Mejores Prácticas

- ✅ Rotar credenciales cada 90 días
- ✅ Usar variables de entorno (no hardcodear)
- ✅ Habilitar 2FA en Google Workspace
- ✅ Revisar audit logs semanalmente
- ✅ Limitar scope de impersonación
- ❌ Nunca commitear `.env.local`
- ❌ Nunca compartir credenciales por Slack/email

## 🚢 Despliegue

### Google Cloud Run (Recomendado)

```bash
# Build
pnpm build

# Deploy
gcloud run deploy verifactu-admin \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NEXTAUTH_URL=https://admin.verifactu.business"
```

### Vercel

```bash
vercel --prod
```

Configurar variables de entorno en Vercel Dashboard.

### Variables de Producción

⚠️ **Crítico:** Configura estas variables en tu plataforma de deploy:

- `NEXTAUTH_URL` → `https://admin.verifactu.business`
- `NEXTAUTH_SECRET` → Generar nuevo con `openssl rand -base64 32`
- Todas las claves de `.env.local`

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 📚 Documentación Adicional

- [Guía de Configuración OAuth](./docs/OAUTH_SETUP.md)
- [Arquitectura RBAC](../../packages/auth/README.md)
- [Integración con Stripe](./docs/STRIPE_INTEGRATION.md)
- [Modo Impersonación](./docs/IMPERSONATION_GUIDE.md)
- [API Reference](./docs/API_REFERENCE.md)

## 🆘 Soporte

**Email:** dev@verifactu.business  
**Slack:** `#admin-panel-dev`  
**Issues:** [GitHub Issues](https://github.com/kiabusiness2025/verifactu-monorepo/issues)

---

**⚠️ IMPORTANTE:** Este panel tiene acceso a datos sensibles de todos los clientes. Usa con responsabilidad y siguiendo las políticas de seguridad de la empresa.
