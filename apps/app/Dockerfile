FROM node:18-alpine AS base

# PNPM is used in the monorepo, so we need it
RUN corepack enable

WORKDIR /app

# Copy workspace files from the root
COPY turbo.json ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the necessary package.json for the app
COPY apps/app/package.json ./apps/app/

# Copy only the necessary source code for the app
COPY apps/app ./apps/app
COPY packages ./packages

# Install dependencies and build only the target app
RUN pnpm install --filter verifactu-app
RUN pnpm run build --filter=verifactu-app

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=base /app/apps/app/.next/standalone ./
COPY --from=base /app/apps/app/.next/static ./.next/static
COPY --from=base /app/apps/app/public ./public
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]