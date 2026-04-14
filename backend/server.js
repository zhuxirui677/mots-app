require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Only allow requests from the configured frontend origin.
// In production set FRONTEND_ORIGIN to your Vercel URL.
const allowedOrigin = process.env.FRONTEND_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Render health probes)
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

// ── Health check ──────────────────────────────────────────────────────────────
// Render pings GET /health to decide if the service is alive.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API key guard — fail fast on startup if key is missing ───────────────────
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set. Exiting.');
  process.exit(1);
}

// ── Routes ───────────────────────────────────────────────────────────────────
const sessionsRouter = require('./routes/sessions');
app.use('/api/sessions', sessionsRouter);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MOTS backend listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`CORS allowed origin: ${allowedOrigin}`);
});
