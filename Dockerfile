FROM node:20-slim

# Install OpenSSL so Prisma can detect the correct version (3.x)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/ ./

# Generate Prisma client AFTER openssl is installed so it picks debian-openssl-3.0.x
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "server.js"]