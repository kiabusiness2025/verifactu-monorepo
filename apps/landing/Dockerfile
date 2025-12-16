FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --filter=verifactu-landing

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]