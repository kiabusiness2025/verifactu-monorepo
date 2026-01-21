# @verifactu/db

Shared database package with Prisma schema and client for the Verifactu monorepo.

## Structure

```
packages/db/
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed script
├── index.ts            # Prisma client export
└── package.json
```

## Database Schema

### Core Models

- **User**: Users with role (USER, SUPPORT, ADMIN)
- **Company**: Companies with owner relationship
- **CompanyMember**: Multi-user company support
- **Subscription**: Subscription status and Stripe integration
- **AuditLog**: Admin actions audit trail

### NextAuth Models

- **Account**: OAuth provider accounts
- **Session**: User sessions
- **VerificationToken**: Email verification tokens

## Usage

### Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Create and run migration
pnpm db:migrate

# Deploy migrations (production)
pnpm db:migrate:deploy

# Run seed script
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
```

### In Your App

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
