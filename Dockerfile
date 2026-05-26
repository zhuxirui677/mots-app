FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install ALL deps (prisma CLI is in devDependencies)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Generate Prisma client at build time
RUN npx prisma generate

EXPOSE 3001

# Run DB migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
