# Database Setup Guide

This guide explains how to set up and use the PostgreSQL database with Prisma for verifactu-landing.

## Prerequisites

- PostgreSQL database (local, Docker, or Google Cloud SQL)
- Node.js and npm installed

## Local Development Setup

### Option 1: Using Docker

```bash
# Run PostgreSQL in Docker
docker run --name verifactu-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_USER=verifactu \
  -e POSTGRES_DB=verifactu \
  -p 5432:5432 \
  -d postgres:15-alpine

# Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://verifactu:yourpassword@localhost:5432/verifactu"
```

### Option 2: Local PostgreSQL Installation

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb verifactu

# Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://yourusername@localhost:5432/verifactu"
```

## Prisma Commands

### Generate Prisma Client

After any schema changes, generate the Prisma client:

```bash
npx prisma generate
```

### Create and Apply Migrations

```bash
# Create a new migration (development)
npx prisma migrate dev --name init

# Apply migrations (production)
npx prisma migrate deploy
```

### Seed Database (Optional)

```bash
# Add seed script to package.json first
npx prisma db seed
```

### Prisma Studio (Database GUI)

```bash
# Open Prisma Studio to view/edit data
npx prisma studio
```

### Reset Database (Development Only)

```bash
# WARNING: This will delete all data
npx prisma migrate reset
```

## Google Cloud SQL Setup

### 1. Create Cloud SQL Instance

```bash
gcloud sql instances create verifactu-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1
```

### 2. Create Database

```bash
gcloud sql databases create verifactu \
  --instance=verifactu-db
```

### 3. Set Root Password

```bash
gcloud sql users set-password postgres \
  --instance=verifactu-db \
  --password=YOUR_SECURE_PASSWORD
```

### 4. Configure Cloud Run Connection

```bash
# Get instance connection name
gcloud sql instances describe verifactu-db --format="value(connectionName)"

# Update Cloud Run service
gcloud run services update verifactu-landing \
  --add-cloudsql-instances=PROJECT_ID:REGION:verifactu-db \
  --set-secrets="DATABASE_URL=database-url:latest"
```

### 5. Store DATABASE_URL in Secret Manager

```bash
# Format for Cloud SQL
# postgresql://USERNAME:PASSWORD@/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE

echo -n "postgresql://postgres:PASSWORD@/verifactu?host=/cloudsql/PROJECT:REGION:verifactu-db" | \
  gcloud secrets create database-url --data-file=-
```

## Run Migrations in Production

### Option 1: Cloud Build Step

Add to `cloudbuild.yaml`:

```yaml
- name: 'node:18-alpine'
  entrypoint: 'sh'
  args:
    - '-c'
    - |
      cd apps/landing
      npm ci
      npx prisma migrate deploy
  env:
    - 'DATABASE_URL=$$DATABASE_URL'
  secretEnv: ['DATABASE_URL']
```

### Option 2: Cloud Run Job

```bash
gcloud run jobs create verifactu-migrate \
  --image gcr.io/PROJECT_ID/verifactu-landing \
  --command="npx,prisma,migrate,deploy" \
  --region=europe-west1 \
  --set-cloudsql-instances=PROJECT:REGION:verifactu-db \
  --set-secrets="DATABASE_URL=database-url:latest"
```

## Database Schema

The schema includes:

- **User**: User accounts with email/password and OAuth support
- **Account**: OAuth provider accounts (Google, etc.)
- **Session**: User sessions for NextAuth
- **VerificationToken**: Email verification tokens

## Troubleshooting

### Connection Issues

```bash
# Test database connection
npx prisma db push --skip-generate

# View current database URL (without password)
echo $DATABASE_URL | sed 's/:[^@]*@/:****@/'
```

### Migration Issues

```bash
# View migration status
npx prisma migrate status

# Mark migration as applied
npx prisma migrate resolve --applied MIGRATION_NAME

# Create baseline migration for existing database
npx prisma migrate resolve --applied "0_init"
```

### Cloud SQL Proxy (Local Testing)

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.7.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Run proxy
./cloud-sql-proxy PROJECT:REGION:verifactu-db

# Connect using
DATABASE_URL="postgresql://postgres:password@localhost:5432/verifactu"
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong passwords** - Generate with `openssl rand -base64 32`
3. **Rotate credentials** - Change passwords regularly
4. **Use Secret Manager** - Store production credentials in Google Secret Manager
5. **Enable SSL** - Use `?sslmode=require` in DATABASE_URL for Cloud SQL
6. **Restrict access** - Configure Cloud SQL authorized networks
7. **Enable backups** - Configure automated backups in Cloud SQL

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth Prisma Adapter](https://next-auth.js.org/adapters/prisma)
- [Google Cloud SQL](https://cloud.google.com/sql/docs)
