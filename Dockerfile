FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate

EXPOSE 3001

# server.js starts immediately (health check passes) then retries migrations
# async until Neon DB wakes up — no blocking at container start
CMD ["node", "server.js"]
