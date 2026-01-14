# 🔍 Estado Actual de Sincronización de Usuarios

## Problema Identificado
- **Firebase**: 3 usuarios registrados
- **Admin Panel**: Solo 1 usuario visible
- **Causa**: Landing NO sincroniza usuarios con la BD (falta llamada a `/api/auth/sync-user`)

## Flujos Actuales

### ✅ Apps/App (Dashboard)
```
Login/Signup → Firebase ✓
             → /api/auth/sync-user ✓
             → PostgreSQL (Prisma) ✓
             → Admin Panel visible ✓
```

### ❌ Apps/Landing (Pública)
```
Login/Signup → Firebase ✓
             → /api/auth/sync-user ✗ (FALTA)
             → PostgreSQL (Prisma) ✗
             → Admin Panel NO visible ✗
```

## Trabajos Pendientes

### 1. **Sincronización de Usuarios** (CRÍTICO)
- [ ] Llamar `/api/auth/sync-user` desde signup landing
- [ ] Llamar `/api/auth/sync-user` desde login landing  
- [ ] Sincronizar usuarios existentes de Firebase a BD
- [ ] Verificar que sync-user está disponible en ambas apps

### 2. **Integración de Emails** (READY)
- [ ] Agregar `sendVerificationEmail()` al signup
- [ ] Agregar `sendWelcomeEmail()` a la verificación
- [ ] Agregar `sendResetPasswordEmail()` a forgot-password
- [ ] Agregar `sendPasswordChangedEmail()` al reset
- [ ] Agregar `sendTeamInviteEmail()` a invitaciones
- [ ] Configurar RESEND_API_KEY en .env

### 3. **Firebase Storage** (NUEVO)
- [ ] Crear estructura de storage por tenant
- [ ] Configurar permisos Firestore Rules
- [ ] Crear endpoint `/api/storage/upload`
- [ ] Integrar en dashboard para documentos

## Archivos a Modificar

### Auth Flow (Landing)
- `apps/landing/app/auth/login/page.tsx` - Agregar sync-user call
- `apps/landing/app/auth/signup/page.tsx` - Agregar sync-user call
- `apps/landing/lib/auth.ts` - Integrar emails

### Auth Flow (App)  
- `apps/app/app/api/auth/sync-user/route.ts` - Validar está completo
- Verificar que se llama desde login

### Email System
- `apps/landing/lib/email/emailService.ts` - YA LISTO
- `apps/landing/app/api/auth/register/route.ts` - Si existe
- `apps/landing/app/api/auth/verify-email/route.ts` - Si existe

### Firebase Storage
- `apps/app/lib/storage.ts` - CREAR NUEVO
- `apps/app/app/api/storage/upload/route.ts` - CREAR NUEVO
- `firestore.rules` - Actualizar permisos

## Prioridad de Implementación

1. **P1**: Fix sincronización (3 usuarios → admin)
2. **P2**: Integrar emails en auth flows
3. **P3**: Firebase Storage para archivos

---

**Última actualización**: Enero 14, 2026
**Estado**: En análisis y planificación
