FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json .npmrc ./
RUN npm install --no-save
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json .npmrc ./
RUN npm install --omit=dev --no-save && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public || true
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "dist/index.js"]
