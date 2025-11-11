# 1) Deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Run (standalone)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copiamos la salida standalone de Next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Si existe public en el repo, la copiamos; si no, crea una vacía en tu proyecto
# (Docker no soporta COPY condicional)
RUN mkdir -p ./public
# Intento de copia; si no existe en builder, no fallará porque ya creamos ./public destino.
# Nota: Si en tu builder no hay /app/public, comenta la siguiente línea.
COPY --from=builder /app/public ./public
ENV PORT=8080
EXPOSE 8080
CMD ["node","server.js"]
