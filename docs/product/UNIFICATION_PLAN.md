# Plan de unificación — Verifactu Business

## Objetivo

Unificar /api, /landing, /app (cliente) y /admin bajo una sola base de datos y una sola forma de acceso a datos.

## Fuente de verdad propuesta

- Prisma compartido en [packages/db](packages/db), ya usado por /admin y parte de /app.

## Divergencias detectadas

1. **/app** usa Prisma y también SQL directo.
   - SQL directo: [apps/app/lib/db-queries.ts](apps/app/lib/db-queries.ts)
   - Prisma: [apps/app/lib/prisma.ts](apps/app/lib/prisma.ts)

2. **/landing** usa SQL directo para sesión:
   - [apps/landing/app/api/auth/session/route.ts](apps/landing/app/api/auth/session/route.ts)

3. **Modelo de gastos y categorías** no está alineado:
   - SQL actual: `expenses`, `expense_categories` en [db/schema.sql](db/schema.sql)
   - Prisma actual: `ExpenseRecord` en [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)

4. **Modelo de usuario**:
   - SQL actual usa `users.id = Firebase UID`.
   - Prisma actual usa `User.id` propio y `authSubject` para Firebase.

## Decisiones necesarias (propuesta)

1. **Prisma será la fuente de verdad** (evitar SQL directo en apps).
2. **Firebase UID** se guarda en `User.authSubject` (no en `User.id`).
3. **Gastos y categorías** se normalizan en Prisma.

## Fases

### Fase 1 — Unificar acceso a datos (sin cambiar UX)

**Objetivo:** eliminar SQL directo en /app y /landing.

Acciones:

- Migrar funciones de [apps/app/lib/db-queries.ts](apps/app/lib/db-queries.ts) a Prisma.
- Reescribir [apps/landing/app/api/auth/session/route.ts](apps/landing/app/api/auth/session/route.ts) para usar Prisma y `authSubject`.

### Fase 2 — Alinear modelo de gastos

**Objetivo:** que categorías y gastos estén en Prisma y sean consistentes.

Acciones:

- Añadir `ExpenseCategory` en Prisma y relación con `ExpenseRecord`.
- Añadir `categoryId` a `ExpenseRecord` y migrar datos existentes si aplica.

### Fase 3 — Consolidar sesión y tenant

**Objetivo:** un único flujo usuario → tenant → permisos.

Acciones:

- Extraer helpers de sesión y tenant a un módulo compartido (ej. packages/utils o packages/db).
- Reutilizar en /app y /landing.

### Fase 4 — Validación final

**Objetivo:** flujo completo coherente.

Acciones:

- Alta usuario → creación de tenant → dashboard con datos reales.
- Registro de gasto y factura → resumen correcto.

## Siguiente paso inmediato (si confirmas)

Comienzo Fase 1:

- Sustituir SQL directo en [apps/app/lib/db-queries.ts](apps/app/lib/db-queries.ts) por Prisma.
- Ajustar sesión en [apps/landing/app/api/auth/session/route.ts](apps/landing/app/api/auth/session/route.ts) para usar `User.authSubject`.
