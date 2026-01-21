# Database Setup - Next Steps

Package `@verifactu/db` creado exitosamente. Ahora sigue estos pasos:

## 1. Instalar Dependencias

```bash
# Desde la raíz del monorepo
pnpm install
```

Esto instalará todas las dependencias incluyendo Prisma en `packages/db`.

## 2. Configurar DATABASE_URL

Copia el `.env.example` y créate tu `.env`:

```bash
cd packages/db
cp .env.example .env
```

Edita `.env` con tu conexión real:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/verifactu?schema=public"
```

## 3. Generar Cliente Prisma

```bash
cd packages/db
pnpm db:generate
```

Esto genera los tipos TypeScript desde el schema.

## 4. Crear Base de Datos y Migrar

### Opción A: Desarrollo Rápido (db push)

```bash
cd packages/db
pnpm db:push
```

Sincroniza el schema directamente sin crear archivos de migración.

### Opción B: Migración Formal (recomendado)

```bash
cd packages/db
pnpm db:migrate
# Te pedirá un nombre para la migración, ej: "init"
```

Crea archivos de migración en `prisma/migrations/`.

## 5. Seed Datos Iniciales

```bash
cd packages/db
pnpm db:seed
```

Crea:

- Usuario admin: `support@verifactu.business` (ADMIN)
- Usuario test: `test@example.com` (USER)
- Empresa test: "Test Company SL" (B12345678)
- Suscripción trial

## 6. Verificar en Prisma Studio

```bash
cd packages/db
pnpm db:studio
```

Abre una interfaz web en `http://localhost:5555` para ver los datos.

## 7. Actualizar apps/admin/.env

Asegúrate que `apps/admin/.env` también tenga el `DATABASE_URL`:

```env
# apps/admin/.env
DATABASE_URL="postgresql://user:password@localhost:5432/verifactu?schema=public"
NEXTAUTH_SECRET="..."
ADMIN_ALLOWED_EMAIL="support@verifactu.business"
ADMIN_ALLOWED_DOMAIN="verifactu.business"
# ... resto de vars
```

## 8. Probar el Panel Admin

```bash
cd apps/admin
pnpm dev
```

Accede a `http://localhost:3003` y prueba login con tu cuenta de Google Workspace.

## Verificación Rápida

```bash
# 1. Instalar
pnpm install

# 2. Generar cliente
cd packages/db && pnpm db:generate

# 3. Migrar
pnpm db:migrate

# 4. Seed
pnpm db:seed

# 5. Verificar
pnpm db:studio
```

## Troubleshooting

### Error: "Can't reach database server"

- Verifica que PostgreSQL esté corriendo
- Verifica el `DATABASE_URL` en `.env`
- Prueba la conexión: `psql $DATABASE_URL`

### Error: "Environment variable not found: DATABASE_URL"

- Asegúrate de tener `.env` en `packages/db/`
- Ejecuta comandos desde `packages/db/` o usa `dotenv`

### Error: "@verifactu/db not found"

- Ejecuta `pnpm install` desde la raíz
- Verifica que `pnpm-workspace.yaml` incluye `packages/*`

## Arquitectura

```
packages/db/
├── prisma/
│   ├── schema.prisma    # ✅ Schema definido
│   ├── seed.ts          # ✅ Seed script
│   └── migrations/      # ⏳ Se crea con migrate
├── index.ts             # ✅ Export PrismaClient
├── package.json         # ✅ Scripts configurados
└── README.md            # ✅ Documentación

apps/admin/
├── lib/
│   ├── prisma.ts        # ✅ Re-exporta @verifactu/db
│   └── auth-options.ts  # ✅ Usa PrismaAdapter
└── package.json         # ✅ Depende de @verifactu/db
```

## Próximos Pasos

Una vez completados estos pasos, continúa con:

1. **Actualizar APIs**: Reemplazar mock data con Prisma queries
2. **Actualizar lib/audit.ts**: Implementar con Prisma
3. **Testing**: Verificar flujo completo de autenticación e impersonación
4. **Deploy**: Configurar DATABASE_URL en producción

---

**Estado Actual**: ✅ Schema creado, ⏳ Pendiente: install → migrate → seed → test
