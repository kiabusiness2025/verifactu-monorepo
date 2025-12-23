# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Asegura build (standalone debe estar en next.config.js)
RUN npm run build

# ---- runner (standalone) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copiamos el servidor standalone (incluye node_modules mínimos)
COPY --from=builder /app/.next/standalone ./
# Static assets necesarios para CSS/JS
COPY --from=builder /app/.next/static ./.next/static
# Public assets
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]
