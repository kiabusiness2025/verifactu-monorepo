FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.27.0
COPY pnpm-lock.yaml package.json tsconfig.json .npmrc ./
COPY apps/holded-mcp ./apps/holded-mcp
RUN pnpm install --frozen-lockfile
RUN cd apps/holded-mcp && pnpm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@10.27.0
COPY pnpm-lock.yaml package.json .npmrc ./
COPY apps/holded-mcp/package.json ./apps/holded-mcp/
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY --from=builder /app/apps/holded-mcp/dist ./dist
COPY apps/holded-mcp/public ./public 2>/dev/null || true

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["node", "dist/index.js"]
