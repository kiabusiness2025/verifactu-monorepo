FROM node:20-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy the application code
COPY . ./

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy standalone build output
COPY --from=base --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=base --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=base --chown=appuser:appgroup /app/public ./public

# Switch to non-root user
USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]

