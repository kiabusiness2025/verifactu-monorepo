# verifactu-monorepo

This is the monorepo for the VeriFactu project.

## Applications

*   `api`: The backend API.
*   `app`: The main web application.
*   `landing`: The landing page.

## Services

*   `invoices`: The invoices service.
*   `notifications`: The notifications service.

## Packages

*   `ui`: Shared UI components.
*   `utils`: Shared utility functions.

## Deployment

This project is deployed to **Google Cloud Run**. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.

**Note:** We use Google Cloud Run for all production deployments, not Vercel.

## Quick Start

```bash
# Install dependencies
npm install

# Run development servers
npm run dev

# Build all applications
npm run build

# Run tests
npm run test
```

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Google Cloud Run deployment
- [Domain Mapping](DOMAIN_MAPPING.md) - Custom domain configuration
- [Database Setup](apps/landing/DATABASE.md) - PostgreSQL with Prisma
- [Testing Guide](apps/app/TESTING.md) - Testing configuration