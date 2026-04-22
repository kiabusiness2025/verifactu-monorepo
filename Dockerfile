# Dockerfile para Holded MCP Server (monorepo)
# Construye desde apps/holded-mcp

FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/holded-mcp/package*.json apps/holded-mcp/tsconfig.json ./
RUN npm ci
COPY apps/holded-mcp/src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY apps/holded-mcp/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1
USER node
CMD ["node", "dist/index.js"]
