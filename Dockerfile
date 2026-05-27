FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate

EXPOSE 3001

# Run migrations + seed templates, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node server.js"]