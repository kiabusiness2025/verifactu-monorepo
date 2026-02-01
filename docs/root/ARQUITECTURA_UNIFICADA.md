# 🏗️ Arquitectura Unificada - Verifactu Business

## 📊 Decisión Arquitectónica

**Problema identificado:** Riesgo de conflicto entre Firebase Hosting y Vercel en `app.verifactu.business`

**Solución adoptada:** Arquitectura híbrida con separación de responsabilidades

---

## 🎯 Distribución de Servicios

### **Vercel - Hosting de Aplicaciones**
✅ **Responsabilidad:** Hosting y deployment de aplicaciones web Next.js

- 🌐 **Dominio:** `app.verifactu.business`
- 📁 **Apps desplegadas:**
  - `apps/app` - Dashboard principal (Next.js 14)
  - `apps/landing` - Landing page (Next.js 14)
- ⚡ **Ventajas:**
  - Mejor integración con Next.js (Edge Functions, ISR, SSR)
  - Deploy automático desde GitHub
  - Preview deployments en PRs
  - Analytics integrado
  - CDN global

**Configuración actual:**
```json
// vercel.json
{
  "buildCommand": "cd ../.. && npx pnpm install --frozen-lockfile && npx pnpm run build --filter=verifactu-app",
  "outputDirectory": ".next"
}
```

---

### **Firebase - Servicios Backend**
✅ **Responsabilidad:** Servicios backend y datos en tiempo real

**Servicios activos:**

#### 1. 🔐 **Firebase Authentication**
```typescript
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
```
- Login con email/password
- OAuth providers (Google, GitHub, etc.)
- Gestión de sesiones
- Tokens JWT

#### 2. 🗄️ **Cloud Firestore**
```typescript
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
```
- Base de datos NoSQL en tiempo real
- Sincronización offline
- Queries complejas
- Real-time listeners

#### 3. 🎛️ **Remote Config**
```typescript
import { getFeatureFlag } from '@/lib/remoteConfig';
const isChatEnabled = getFeatureFlag('feature_isaak_chat');
```
- Feature flags dinámicos
- A/B testing
- Configuración sin deployment
- Mantenimiento programado

#### 4. 📊 **Firebase Analytics**
```typescript
import { trackLogin, trackInvoiceCreated } from '@/components/FirebaseAnalytics';
trackLogin('email');
```
- Eventos personalizados
- User tracking
- Funnels de conversión
- Integración con Google Analytics 4

**Configuración centralizada:**
```typescript
// apps/app/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o",
  authDomain: "verifactu-business.firebaseapp.com",
  projectId: "verifactu-business",
  storageBucket: "verifactu-business.firebasestorage.app",
  messagingSenderId: "536174799167",
  appId: "1:536174799167:web:69c286d928239c9069cb8a",
  measurementId: "G-F91R5J137F"
};
```

---

### **PostgreSQL + Prisma - Base de Datos Relacional**
✅ **Responsabilidad:** Datos estructurados y transacciones ACID

**Uso:**
- Multi-tenancy (Tenants, Users, Memberships)
- Facturación (Invoices, Payments)
- Suscripciones (Plans, Subscriptions)

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

**Ubicación:** `apps/app/prisma/schema.prisma`

---

## 🔄 Flujo de Datos

```
┌─────────────────┐
│   Usuario       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Vercel (Next.js)           │
│  app.verifactu.business     │
│  - SSR/ISR/Static           │
│  - API Routes               │
└────────┬────────────────────┘
         │
         ├──────────────┬──────────────┬────────────┐
         ▼              ▼              ▼            ▼
┌──────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
│ Firebase     │ │ Firebase    │ │ Firebase │ │ Prisma   │
│ Auth         │ │ Firestore   │ │ Remote   │ │ Postgres │
│              │ │             │ │ Config   │ │          │
└──────────────┘ └─────────────┘ └──────────┘ └──────────┘
```

---

## 📱 Flutter Mobile App

**Uso de Firebase:**
- ✅ Firebase Core inicializado
- ✅ Authentication (login/registro)
- ✅ Firestore (facturas en tiempo real)
- ✅ Remote Config (feature flags)

**Ubicación:** `apps/mobile/`

---

## 🚀 Deployment Pipeline

### **Web Apps (Vercel)**
```bash
# Push a GitHub main branch
git push origin main

# Vercel auto-deployment:
# 1. Build en Vercel Edge Network
# 2. Deploy a app.verifactu.business
# 3. Invalidación de CDN
```

### **Mobile App (Flutter)**
```bash
# Android
flutter build apk --release

# iOS
flutter build ios --release

# Web (Firebase Hosting podría usarse para mobile web)
flutter build web
```

---

## 🔧 Comandos Útiles

### Desarrollo Local
```bash
# Web apps
pnpm dev

# Flutter
cd apps/mobile
flutter run -d chrome  # Web
flutter run            # Android/iOS
```

### Build Production
```bash
# Web
pnpm build --filter=verifactu-app

# Flutter
flutter build apk --release
```

### Firebase CLI
```bash
# No usar para hosting web (conflicto con Vercel)
# Solo para mobile o servicios backend

firebase login
firebase projects:list
```

---

## ⚠️ Notas Importantes

1. **NO usar Firebase Hosting para apps/app** - Ya está en Vercel
2. **Firebase = Backend Services only** para web app
3. **Prisma para datos relacionales** con transacciones
4. **Firestore para datos en tiempo real** (chat, notificaciones)
5. **Remote Config para feature flags** sin redeploy

---

## 📦 Dependencias Instaladas

### Web (apps/app)
```json
{
  "firebase": "^11.x.x",
  "@prisma/client": "^7.2.0",
  "prisma": "^5.20.0"
}
```

### Mobile (apps/mobile)
```yaml
dependencies:
  firebase_core: ^4.3.0
  firebase_auth: ^6.1.3
  cloud_firestore: ^6.1.1
  firebase_remote_config: ^6.1.3
```

---

## ✅ Ventajas de esta Arquitectura

| Aspecto | Solución | Beneficio |
|---------|----------|-----------|
| **Hosting Next.js** | Vercel | Edge runtime, ISR, mejor DX |
| **Auth** | Firebase | Proveedores OAuth, tokens JWT |
| **Real-time** | Firestore | Listeners, offline sync |
| **Config dinámica** | Remote Config | Sin redeploy |
| **Analytics** | Firebase + Vercel | Datos completos |
| **Datos relacionales** | Prisma + Postgres | ACID, multi-tenant |

---

## 🎯 Próximos Pasos

- [ ] Implementar Firebase Auth en UI
- [ ] Conectar Firestore para notificaciones
- [ ] Configurar Remote Config en producción
- [ ] Sincronizar datos entre Prisma y Firestore
- [ ] Deploy de Flutter app a Play Store/App Store

---

**Última actualización:** 13 enero 2026  
**Arquitecto:** Sistema unificado Vercel + Firebase + Prisma
