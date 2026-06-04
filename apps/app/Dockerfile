FROM node:20-alpine AS base

# PNPM is used in the monorepo, so we need it
RUN corepack enable

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Copy workspace files from the root
COPY turbo.json ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the necessary package.json for the app
COPY apps/app/package.json ./apps/app/

# Copy only the necessary source code for the app
COPY apps/app ./apps/app
COPY packages ./packages

# Install dependencies and build only the target app
RUN pnpm install --filter verifactu-app --frozen-lockfile
ENV STANDALONE_BUILD=1
RUN pnpm --filter verifactu-app build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
COPY --from=base /app/apps/app/.next/standalone ./
COPY --from=base /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=base /app/apps/app/public ./apps/app/public
EXPOSE 8080
CMD ["node", "apps/app/server.js"]
