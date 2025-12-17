FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY . .
RUN pnpm install --filter verifactu-landing
RUN pnpm run build --filter=verifactu-landing
RUN pnpm deploy --filter verifactu-landing /prod

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=base /prod .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
