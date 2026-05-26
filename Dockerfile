FROM node:20-alpine

WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate

EXPOSE 3001

# Start server directly — migrations should be run manually or via Render job
CMD ["node", "server.js"]