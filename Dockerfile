FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate

EXPOSE 3001

# migrate + seed are best-effort; server starts even if DB is waking up
CMD ["sh", "-c", "(npx prisma migrate deploy || true) && (npx prisma db seed || true) && node server.js"]
