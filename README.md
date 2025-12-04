# verifactu-monorepo

This is the monorepo for the VeriFactu project - a Spanish tax compliance system for invoice verification (AEAT VeriFactu).

## Structure

This is a Turborepo-based monorepo with the following structure:

### Applications (`apps/`)

*   **`api`**: Backend API service for VeriFactu SOAP integration
    - Express.js server with AEAT certificate-based authentication
    - SOAP client for invoice registration and queries
    - Rate limiting and security headers
*   **`app`**: Main web application (Next.js)
    - Admin dashboard for invoice management
    - Calendar and table views
    - Built with React, TypeScript, and Tailwind CSS
*   **`landing`**: Marketing landing page (Next.js)
    - Public-facing website
    - Pricing calculator and FAQ
    - Stripe integration for payments

### Packages (`packages/`)

*   **`ui`**: Shared UI components library
*   **`utils`**: Shared utility functions
*   **`eslint-config`**: Shared ESLint configuration
*   **`typescript-config`**: Shared TypeScript configuration

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 11.6.2 or higher (specified in package.json)

### Installation

```bash
npm install
```

### Development

Run all applications in development mode:

```bash
npm run dev
```

### Build

Build all applications:

```bash
npm run build
```

### Testing

Run tests across all packages:

```bash
npm run test
```

### Linting

Lint all packages:

```bash
npm run lint
```

## Deployment

The project uses Google Cloud Build for CI/CD with separate configurations for different environments:

- `cloudbuild-dev.yaml` - Development environment
- `cloudbuild-pre.yaml` - Pre-production environment
- `cloudbuild-prod.yaml` - Production environment

Each application is deployed to Google Cloud Run with automatic change detection to avoid unnecessary deployments.

## Environment Variables

### API Service

- `AEAT_CERT_PATH`: Path to AEAT certificate (.p12 file)
- `AEAT_CERT_PASS_PATH`: Path to certificate password file
- `AEAT_WSDL_FILE`: Path to WSDL URL file
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 8080)

## Security

- Certificate-based authentication with AEAT
- Rate limiting on API endpoints (60 requests per minute)
- CORS protection with allowed origins whitelist
- Security headers (CSP, X-Frame-Options, etc.)
- Secrets management via mounted files (Google Secret Manager)