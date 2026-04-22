FROM node:20-alpine

RUN npm install -g pnpm@10.27.0

WORKDIR /usr/src/app

# Create and use a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Copy package files and set ownership
COPY --chown=appuser:appgroup package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies as the non-root user
RUN pnpm install --frozen-lockfile --prod

# Copy the rest of the application code and set ownership
COPY --chown=appuser:appgroup . .
# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and define command
EXPOSE 8080
CMD ["pnpm", "start"]
