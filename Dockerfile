# Dockerfile para Holded MCP Server (monorepo)
# Construye desde apps/holded-mcp

FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.27.0
COPY apps/holded-mcp/package*.json apps/holded-mcp/pnpm-lock.yaml* apps/holded-mcp/tsconfig.json ./
RUN pnpm install --no-frozen-lockfile
COPY apps/holded-mcp/src ./src
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.27.0
COPY apps/holded-mcp/package*.json apps/holded-mcp/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile --prod && pnpm store prune
COPY --from=builder /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1
USER node
CMD ["node", "dist/index.js"]
