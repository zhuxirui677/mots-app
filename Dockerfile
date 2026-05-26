FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "server.js"]
