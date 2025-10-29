FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files from the 'api' subdirectory
COPY api/package*.json ./

# Install production dependencies
# We run this as root to ensure node_modules can be created without permission issues
RUN npm install --omit=dev

# Copy the rest of the application code from the 'api' subdirectory
COPY api/ .

# Create and use a non-root user, and set correct ownership
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and define command
EXPOSE 8080
CMD ["npm", "run", "start"]
