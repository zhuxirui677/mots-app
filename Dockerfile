FROM node:20-slim

WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "server.js"]