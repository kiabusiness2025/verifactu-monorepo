# @verifactu/db

Paquete compartido de base de datos (Prisma) para el monorepo Verifactu.

## Stack
- Prisma ORM
- PostgreSQL
- TypeScript

## Estructura
```
packages/db/
├── prisma/        # schema.prisma, seed.ts
├── src/           # prisma.ts, index.ts
├── package.json
```

## Modelos principales
- User, Company, CompanyMember, Subscription, AuditLog
- NextAuth: Account, Session, VerificationToken

## Scripts utiles
- `pnpm db:generate` - Prisma Client
- `pnpm db:push` - Push schema
- `pnpm db:migrate` - Migraciones
- `pnpm db:seed` - Seed datos demo
- `pnpm db:studio` - Prisma Studio

## Primeros pasos
1. Configura `.env.local` con tu DATABASE_URL
2. `pnpm install`
3. `pnpm db:generate`

---
Actualizado: enero 2026

```typescript
import { prisma } from '@verifactu/db';

// Query users
const users = await prisma.user.findMany({
  where: { role: 'ADMIN' },
});

// Create company
const company = await prisma.company.create({
  data: {
    name: 'My Company',
    taxId: 'B12345678',
    ownerUserId: userId,
  },
});
```

### Environment Variables

Add to your `.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/verifactu?schema=public"
```

## Development Workflow

1. **Modify schema**: Edit `prisma/schema.prisma`
2. **Generate client**: Run `pnpm db:generate`
3. **Create migration**: Run `pnpm db:migrate`
4. **Seed data**: Run `pnpm db:seed`

## Seed Data

The seed script creates:

- Admin user: `support@verifactu.business` (ADMIN role)
- Test user: `test@example.com` (USER role)
- Test company: "Test Company SL" (B12345678)
- Trial subscription for test company

## Integration with NextAuth

This package includes the required models for `@next-auth/prisma-adapter`:

- Account
- Session
- VerificationToken

Configure in your NextAuth setup:

```typescript
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@verifactu/db';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  // ... rest of config
};
```

## Prisma Client compartido
El cliente Prisma se centraliza en `packages/db/src/prisma.ts` y se exporta desde `packages/db/src/index.ts`.

Semilla (seed):
- En `packages/db/package.json` ya esta configurado:
  - `"prisma": { "seed": "tsx prisma/seed.ts" }`
  - `tsx` en `devDependencies`
