FROM node:20-slim AS base

# PNPM is used in the monorepo, so we need it
RUN corepack enable

WORKDIR /app

# Copy only the necessary package.json for the app
COPY package.json pnpm-lock.yaml ./

# Copy only the necessary source code for the app
COPY . .

# Install dependencies and build only the target app
RUN pnpm install --filter verifactu-landing
RUN pnpm run build --filter=verifactu-landing

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=base /app/apps/landing/.next/standalone ./.next/standalone
COPY --from=base /app/apps/landing/.next/static ./.next/static
COPY --from=base /app/apps/landing/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]