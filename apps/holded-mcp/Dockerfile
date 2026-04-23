FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.27.0
COPY package.json ./
RUN pnpm install
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.27.0
COPY package.json ./
RUN pnpm install --prod && pnpm store prune
COPY --from=builder /app/dist ./dist
COPY public ./public
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1
CMD ["node", "dist/index.js"]
