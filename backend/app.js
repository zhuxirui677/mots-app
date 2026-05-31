'use strict';

const express = require('express');
const cors    = require('cors');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigin = process.env.FRONTEND_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === allowedOrigin) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
  })
);

app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── DB diagnostic (temporary) ─────────────────────────────────
app.get('/health/db', async (_req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    await p.$queryRaw`SELECT 1`;
    res.json({ db: 'ok', DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING' });
  } catch (err) {
    res.status(500).json({ db: 'error', message: err.message, DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING' });
  } finally {
    await p.$disconnect();
  }
});

// ── API key guard ─────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set. Exiting.');
  process.exit(1);
}

// ── Routes ────────────────────────────────────────────────────
const sessionsRouter = require('./routes/sessions');
app.use('/api/sessions', sessionsRouter);

// ── 404 fallback ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
