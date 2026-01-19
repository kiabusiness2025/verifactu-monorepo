# Prisma ORM Guide

## 📦 What is Prisma?

Prisma is a modern ORM (Object-Relational Mapping) that makes working with databases easy and type-safe.

**Key Benefits:**
- ✅ Type-safe database queries (TypeScript)
- ✅ Auto-generated migrations
- ✅ Visual database explorer (Prisma Studio)
- ✅ Automatic schema validation
- ✅ Zero-boilerplate queries

---

## 🗂️ Project Setup

### File Structure

```
apps/app/prisma/
├── schema.prisma      # Database schema definition
├── migrations/        # Auto-generated SQL migrations
│   └── migration_lock.toml
└── .env.local        # Database URL (local only)
```

### Database Models

Current schema has these models:

```prisma
model User              # Users table
model AdminEmail        # Email inbox
model AdminEmailResponse # Email replies
model Invoice          # Invoice data
model Invoice Item     # Line items
model Contact          # Contact info
model Settings         # App settings
```

View full schema: [`apps/app/prisma/schema.prisma`](apps/app/prisma/schema.prisma)

---

## 🚀 Quick Start

### Connect to Database

```bash
# Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/verifactu"

# Or use PostgreSQL in Docker
docker-compose up -d
# PostgreSQL available at: localhost:5432
```

### Create Your First Table

**1. Update schema.prisma:**
```prisma
model Article {
  id        Int     @id @default(autoincrement())
  title     String
  content   String
  published Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**2. Create migration:**
```bash
pnpm prisma migrate dev --name add_articles_table
# Prompts for migration name
# Auto-creates SQL
# Runs migration
# Updates types
```

**3. Use in code:**
```typescript
import { prisma } from '@/lib/prisma';

// Create
const article = await prisma.article.create({
  data: {
    title: "My Article",
    content: "Content here",
  },
});

// Read
const articles = await prisma.article.findMany();

// Update
await prisma.article.update({
  where: { id: 1 },
  data: { published: true },
});

// Delete
await prisma.article.delete({
  where: { id: 1 },
});
```

---

## 📝 Schema Basics

### Model Definition

```prisma
model Post {
  // Fields
  id        Int     @id @default(autoincrement())
  title     String
  content   String?                  // Optional (?)
  published Boolean @default(false)  // Default value
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  authorId  Int
  author    User @relation(fields: [authorId], references: [id])
  comments  Comment[]
}
```

### Field Types

```prisma
String          // Text
Int             // Whole number
Float           // Decimal number
Boolean         // True/false
DateTime        // Date and time
Decimal         // Precise decimals
BigInt          // Large integers
Bytes           // Binary data
Json            // JSON data
```

### Modifiers

```prisma
@id               // Primary key
@unique           // Unique constraint
@default(value)   // Default value
@updatedAt        // Auto-update timestamp
?                 // Optional field
[]                // Array/relation
```

### Relations

**One-to-Many:**
```prisma
model User {
  id    Int
  posts Post[]  // One user has many posts
}

model Post {
  id      Int
  userId  Int
  user    User @relation(fields: [userId], references: [id])
}
```

**Many-to-Many:**
```prisma
model Student {
  id       Int
  name     String
  courses  Course[]
}

model Course {
  id       Int
  name     String
  students Student[]
}
```

---

## 🔄 Working with Migrations

### Generate Migration

```bash
# Make schema changes first
# Then run:
pnpm prisma migrate dev --name description

# What it does:
# 1. Analyzes schema changes
# 2. Creates SQL migration file
# 3. Runs migration
# 4. Regenerates Prisma Client types
```

### Reset Database (Dev Only)

```bash
# ⚠️ CAUTION: Deletes all data
pnpm prisma migrate reset

# What it does:
# 1. Drops database
# 2. Creates new database
# 3. Runs all migrations
# 4. Seeds with data (if seed.ts exists)
```

### View Migration History

```bash
# See all migrations
ls prisma/migrations/

# Example output:
# 20240101120000_init
# 20240102150000_add_emails
# 20240103093000_add_posts
```

### Production Deployment

```bash
# Deploy migrations to production database
pnpm prisma migrate deploy

# What it does:
# 1. Connects to production database
# 2. Runs any pending migrations
# 3. Updates _prisma_migrations table
```

---

## 🎯 Common Operations

### Create Record

```typescript
const user = await prisma.user.create({
  data: {
    email: "john@example.com",
    name: "John Doe",
  },
});
```

### Read Records

```typescript
// Find one
const user = await prisma.user.findUnique({
  where: { id: 1 },
});

// Find first matching
const user = await prisma.user.findFirst({
  where: { email: "john@example.com" },
});

// Find many
const users = await prisma.user.findMany({
  where: { role: "admin" },
  take: 10,      // Limit
  skip: 0,       // Offset
  orderBy: { createdAt: "desc" },
});
```

### Update Record

```typescript
await prisma.user.update({
  where: { id: 1 },
  data: {
    name: "Jane Doe",
  },
});

// Update many
await prisma.user.updateMany({
  where: { role: "user" },
  data: { role: "member" },
});
```

### Delete Record

```typescript
await prisma.user.delete({
  where: { id: 1 },
});

// Delete many
await prisma.user.deleteMany({
  where: { role: "banned" },
});
```

### Count Records

```typescript
const count = await prisma.user.count();
const adminCount = await prisma.user.count({
  where: { role: "admin" },
});
```

---

## 🔍 Prisma Studio

Visual database explorer.

```bash
# Open Prisma Studio
pnpm prisma studio

# Opens browser at http://localhost:5555
# Can browse/edit data visually
```

**Features:**
- View all records
- Create/edit/delete records
- Filter and search
- Export data
- Visual relations

---

## 🚨 Common Patterns

### Include Relations

```typescript
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: true,
    profile: true,
  },
});
```

### Select Specific Fields

```typescript
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    email: true,
    name: true,
    // Omits other fields
  },
});
```

### Conditional Include

```typescript
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    },
  },
});
```

### Transactions

```typescript
// Multiple operations as one atomic transaction
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { email: "john@example.com" } }),
  prisma.post.create({ data: { title: "Hello" } }),
]);
// All succeed or all fail
```

---

## 🔧 Configuration

### .env.local

```env
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/verifactu"

# Optional: for local development
DATABASE_URL_SHADOW="postgresql://user:password@localhost:5432/verifactu_shadow"
```

### .gitignore

```
# Never commit:
.env.local
.env.*.local
prisma/.env
```

---

## 🐛 Troubleshooting

### Migration Issues

**"Error: The database already exists"**
```bash
# Reset and start fresh (dev only!)
pnpm prisma migrate reset
```

**"Error: P1001 Can't reach database"**
```bash
# Check database is running
docker-compose ps

# Check DATABASE_URL
echo $DATABASE_URL
```

### Type Issues

**"Type 'User' not found"**
```bash
# Regenerate Prisma Client
pnpm prisma generate
```

**"Error: Field 'id' not found on model 'User'"**
```bash
# Update schema first
# Then run migration
pnpm prisma migrate dev
```

### Performance

**Slow queries?**
```bash
# Use .select() to only get needed fields
const users = await prisma.user.findMany({
  select: { id: true, email: true },
});

# Or use raw queries for complex operations
const users = await prisma.$queryRaw`
  SELECT * FROM User WHERE role = 'admin'
`;
```

---

## 📚 Related Documentation

- [Prisma Official Docs](https://www.prisma.io/docs)
- [Database Design Guide](DEVELOPMENT.md)
- [Project Schema](../../apps/app/prisma/schema.prisma)

---

Last updated: January 2026
