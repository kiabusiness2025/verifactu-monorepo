FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json .npmrc ./
RUN npm install --no-save --legacy-peer-deps 2>/dev/null || npm install --no-save
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json .npmrc ./
RUN npm install --omit=dev --no-save --legacy-peer-deps 2>/dev/null || npm install --omit=dev --no-save
RUN npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY public ./public 2>/dev/null || true

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["node", "dist/index.js"]
