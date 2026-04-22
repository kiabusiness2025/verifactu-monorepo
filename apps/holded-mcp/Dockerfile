FROM node:20-alpine AS builder
WORKDIR /workspace

# Copy root files needed for monorepo
COPY package.json package-lock.json pnpm-lock.yaml* .npmrc* ./

# Copy holded-mcp files
COPY apps/holded-mcp ./apps/holded-mcp

# Install and build holded-mcp only
WORKDIR /workspace/apps/holded-mcp
RUN npm install --no-save --legacy-peer-deps 2>/dev/null || npm install --no-save
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_PATH=/app/node_modules

# Copy only compiled code and package files
COPY apps/holded-mcp/package.json ./
COPY --from=builder /workspace/apps/holded-mcp/dist ./dist
COPY apps/holded-mcp/public ./public || true
COPY apps/holded-mcp/.npmrc ./

# Install production deps only
RUN npm install --omit=dev --no-save --legacy-peer-deps 2>/dev/null || npm install --omit=dev --no-save
RUN npm cache clean --force

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["node", "dist/index.js"]
