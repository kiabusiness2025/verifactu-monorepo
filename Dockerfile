FROM node:20-alpine

WORKDIR /usr/src/app

# Create and use a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Copy package files from the 'api' subdirectory
COPY api/package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code from the 'api' subdirectory
COPY api/ .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port and define command
EXPOSE 8080
CMD ["npm", "run", "start"]