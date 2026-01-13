# 📖 ÍNDICE COMPLETO - Verifactu Business Monorepo

## 🚀 Comienza Aquí

1. **[README.md](README.md)** - Descripción general del proyecto
2. **[ARQUITECTURA_UNIFICADA.md](ARQUITECTURA_UNIFICADA.md)** - Arquitectura de la solución
3. **[docs/README.md](docs/README.md)** - Índice de documentación

---

## 📁 Estructura del Proyecto

```
verifactu-monorepo/
│
├── README.md                    # 🚀 Empezar aquí
├── ARQUITECTURA_UNIFICADA.md    # 🏗️ Arquitectura
├── INDEX.md                     # 📖 Este archivo
│
├── apps/
│   ├── app/                     # 🎯 Aplicación principal (Next.js)
│   │   ├── lib/
│   │   │   ├── firebase.ts      # Configuración Firebase centralizada
│   │   │   ├── prisma.ts        # Singleton de Prisma Client
│   │   │   ├── genkit.ts        # Genkit AI flows (disabled)
│   │   │   └── remoteConfig.ts  # Remote Config
│   │   ├── components/
│   │   │   ├── auth/            # LoginForm, ProtectedRoute, etc.
│   │   │   ├── layout/          # Topbar, Sidebar, etc.
│   │   │   └── FirebaseAnalytics.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts       # Auth state management
│   │   ├── app/
│   │   │   ├── login/           # Página de login
│   │   │   ├── dashboard/       # Dashboard protegido
│   │   │   └── api/auth/sync-user/ # Sync Firebase → Prisma
│   │   └── prisma/
│   │       └── schema.prisma    # Database schema (8 models)
│   │
│   ├── landing/                 # 🌐 Landing page (Next.js)
│   ├── api/                     # 📡 API backend (opcional)
│   └── mobile/                  # 📱 Flutter app
│       ├── lib/
│       │   ├── main.dart        # Entry point
│       │   ├── services/        # Auth, Invoice, RemoteConfig
│       │   └── pages/           # LoginPage, InvoicesPage
│       └── QUICK_START.md
│
├── packages/
│   ├── ui/                      # 🎨 Componentes compartidos
│   ├── utils/                   # Utilidades compartidas
│   ├── eslint-config/
│   └── typescript-config/
│
├── db/
│   ├── schema.sql               # PostgreSQL DDL
│   └── init-complete.sql        # Datos iniciales
│
├── docs/                        # 📚 Documentación organizada
│   ├── README.md                # Índice de docs
│   ├── setup/                   # Guías de instalación
│   │   ├── FIREBASE_AUTH_SETUP.md
│   │   ├── FIREBASE_CONSOLE_ACCESO.md
│   │   ├── FLUTTER_INSTALLATION_GUIDE.md
│   │   ├── DB_SETUP_GUIDE.md
│   │   └── MULTI_TENANT_AUTH_SETUP.md
│   ├── deployment/              # Guías de despliegue
│   │   ├── VERCEL_DEPLOYMENT_GUIDE.md
│   │   ├── CLOUD_RUN_QUICK_REFERENCE.md
│   │   └── GITHUB_CLOUD_BUILD_SETUP.md
│   ├── ai/                      # Documentación Genkit/AI
│   │   ├── ISAAK_V3_QUICK_START.md
│   │   ├── ISAAK_V3_TESTING_GUIDE.md
│   │   └── ISAAK_V3_IMPLEMENTATION_CHECKLIST.md
│   ├── optimization/            # Performance y auditorías
│   │   ├── LANDING_OPTIMIZATION_STATUS.md
│   │   ├── ACCESSIBILITY_AUDIT.md
│   │   └── IMAGE_OPTIMIZATION_GUIDE.md
│   └── legacy/                  # Archivos antiguos
│
├── scripts/                     # 🔧 Scripts de desarrollo
│   ├── deploy-cloud-run-*.ps1
│   ├── gen-signing-key.*
│   └── check-changes.sh
│
├── brand/                       # 🎨 Assets de branding
│   ├── logo/
│   ├── favicon/
│   └── README.md
│
├── ops/                         # ⚙️ Configuración operacional
│   └── cloudrun/
│
├── secrets/                     # 🔒 Credentials (gitignored)
│
├── firestore.rules              # 🔐 Firestore security rules
├── vercel.json                  # ⚙️ Vercel config
├── turbo.json                   # ⚙️ Turborepo config
├── pnpm-workspace.yaml          # 📦 pnpm workspaces
├── package.json                 # 📦 Root dependencies
├── pnpm-lock.yaml               # 🔒 Lock file
└── .github/workflows/           # 🔄 GitHub Actions
```

---

## 🎯 Rutas de Desarrollo

### ✅ Empezando desde Cero

1. Clonar repo: `git clone https://github.com/kiabusiness2025/verifactu-monorepo.git`
2. Leer: [README.md](README.md)
3. Instalar: `pnpm install`
4. Configurar: `.env.local` en `apps/app/`
5. Desarrollo: `pnpm dev:app`

### 🔐 Configurar Autenticación

1. Leer: [docs/setup/FIREBASE_CONSOLE_ACCESO.md](docs/setup/FIREBASE_CONSOLE_ACCESO.md)
2. Crear cuenta Firebase
3. Habilitar proveedores (Google, Microsoft, Facebook)
4. Copiar credenciales a `apps/app/.env.local`
5. Probar: http://localhost:3000/login

### 📱 Desarrollar App Móvil

1. Leer: [docs/setup/FLUTTER_INSTALLATION_GUIDE.md](docs/setup/FLUTTER_INSTALLATION_GUIDE.md)
2. Instalar Flutter SDK
3. Navegar: `cd apps/mobile`
4. Ejecutar: `flutter run -d chrome`
5. Modificar: `lib/main.dart`, `lib/services/`, `lib/pages/`

### 🗄️ Trabajar con Base de Datos

1. Leer: [docs/setup/DB_SETUP_GUIDE.md](docs/setup/DB_SETUP_GUIDE.md)
2. Crear PostgreSQL
3. Configurar: `DATABASE_URL` en `.env.local`
4. Sincronizar: `npx prisma db push`
5. Ver: `npx prisma studio`

### 🚀 Desplegar a Producción

1. Leer: [docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md](docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md)
2. Conectar GitHub a Vercel
3. Configurar variables de entorno
4. Deploy automático: `git push origin main`

---

## 🔗 Mapeo de Documentación

### Autenticación
| Tema | Ubicación | Descripción |
|------|-----------|-------------|
| Firebase Console | [docs/setup/FIREBASE_CONSOLE_ACCESO.md](docs/setup/FIREBASE_CONSOLE_ACCESO.md) | URLs y acceso a Firebase |
| Auth Setup | [docs/setup/FIREBASE_AUTH_SETUP.md](docs/setup/FIREBASE_AUTH_SETUP.md) | Configuración autenticación |
| Multi-tenant | [docs/setup/MULTI_TENANT_AUTH_SETUP.md](docs/setup/MULTI_TENANT_AUTH_SETUP.md) | Estructura multi-tenant |
| Facebook OAuth | [FACEBOOK_OAUTH_SETUP.md](FACEBOOK_OAUTH_SETUP.md) | Facebook login |
| Seguridad | [SECURITY.md](SECURITY.md) | Políticas y mejores prácticas |

### Despliegue
| Tema | Ubicación | Descripción |
|------|-----------|-------------|
| Vercel | [docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md](docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md) | Despliegue en Vercel |
| Cloud Run | [docs/deployment/CLOUD_RUN_QUICK_REFERENCE.md](docs/deployment/CLOUD_RUN_QUICK_REFERENCE.md) | Google Cloud Run |
| CI/CD | [docs/deployment/GITHUB_CLOUD_BUILD_SETUP.md](docs/deployment/GITHUB_CLOUD_BUILD_SETUP.md) | GitHub Actions / Cloud Build |
| IAM | [GOOGLE_CLOUD_RUN_IAM.md](GOOGLE_CLOUD_RUN_IAM.md) | Permisos Google Cloud |

### Mobile
| Tema | Ubicación | Descripción |
|------|-----------|-------------|
| Flutter Install | [docs/setup/FLUTTER_INSTALLATION_GUIDE.md](docs/setup/FLUTTER_INSTALLATION_GUIDE.md) | Instalar Flutter |
| Flutter Setup | [docs/setup/FLUTTER_SETUP.md](docs/setup/FLUTTER_SETUP.md) | Configurar proyecto |
| Mobile Quick Start | [apps/mobile/QUICK_START.md](apps/mobile/QUICK_START.md) | Empezar con app móvil |

### Base de Datos
| Tema | Ubicación | Descripción |
|------|-----------|-------------|
| Setup | [docs/setup/DB_SETUP_GUIDE.md](docs/setup/DB_SETUP_GUIDE.md) | PostgreSQL + Prisma |
| Schema | [apps/app/prisma/schema.prisma](apps/app/prisma/schema.prisma) | 8 modelos de datos |

### AI / Genkit
| Tema | Ubicación | Descripción |
|------|-----------|-------------|
| Quick Start | [docs/ai/ISAAK_V3_QUICK_START.md](docs/ai/ISAAK_V3_QUICK_START.md) | Empezar con Genkit |
| Testing | [docs/ai/ISAAK_V3_TESTING_GUIDE.md](docs/ai/ISAAK_V3_TESTING_GUIDE.md) | Testing de flows |
| Implementation | [docs/ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md](docs/ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md) | Checklist completo |

---

## 📊 Estado Actual del Proyecto

**Completado:** ✅
- Next.js app con autenticación Firebase (email, Google, Microsoft, Facebook)
- Flutter app con Firebase integration
- PostgreSQL con Prisma ORM (8 modelos)
- Firestore security rules (multi-tenant)
- Google Tag Manager integration
- Firebase Analytics tracking
- Remote Config for feature flags
- Email verification requirement
- Auto-sync Firebase → Prisma

**En Progreso:** 🔄
- Genkit AI (temporalmente deshabilitado, espera Google AI API key)
- Dashboard completo

**Pendiente:** ⏳
- Deploy Firestore rules a producción
- Habilitar Microsoft/Facebook OAuth en Firebase Console
- Completar dashboard con datos reales
- Setup pagos con Stripe

---

## 🔧 Tecnologías Principales

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend Web | Next.js | 14.2.35 |
| Frontend Mobile | Flutter | 3.38.6 |
| Language | TypeScript | Strict |
| Styling | Tailwind CSS | Latest |
| Backend Auth | Firebase | 12.x |
| Backend DB | PostgreSQL | 15+ |
| ORM | Prisma | 5.20.0 |
| AI | Genkit | 1.27.0 |
| Hosting | Vercel | - |
| Package Manager | pnpm | 10.27.0 |

---

## 📞 Soporte

**Email:** kiabusiness2025@gmail.com

**URLs Importantes:**
- 🌐 Landing: https://verifactu.business
- 📱 App: https://app.verifactu.business
- 🐍 Firebase Console: https://console.firebase.google.com/project/verifactu-business
- 📊 Vercel: https://vercel.com/kiabusiness2025/verifactu-monorepo
- 💻 GitHub: https://github.com/kiabusiness2025/verifactu-monorepo

---

## 📝 Versión del Documento

- **Actualizado:** Enero 2026
- **Versión:** 2.0
- **Commits desde inicio:** 20+

---

**🎯 Última actualización: Enero 13, 2026**
