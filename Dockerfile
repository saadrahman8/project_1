# Dockerfile for ARCHON Fitness Application
FROM node:24-bookworm-slim

# Set working directory
WORKDIR /app

# Install build dependencies if needed for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/archon_fitness.db

# Expose port
EXPOSE 3000

# Seed database and start application
CMD node src/seed.js && node server.js
