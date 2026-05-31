require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const app  = require('./app');
const PORT = process.env.PORT || 3001;

// Start HTTP server immediately — Render health check passes right away.
// DB setup runs async so Neon has time to wake up.
app.listen(PORT, () => {
  console.log(`MOTS backend listening on port ${PORT}`);
  console.log(`CORS allowed origin: ${process.env.FRONTEND_ORIGIN}`);
  ensureSchema();
});

// Retry DB setup every 5 s, up to 20 attempts (~100 s) — enough for Neon cold start.
async function ensureSchema(attempt = 1) {
  const MAX = 20;
  const p = new PrismaClient();
  try {
    // Create enum + sessions table if they don't exist.
    // idempotent: safe to run against a DB that already has the tables.
    await p.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SessionStatus" AS ENUM ('pending', 'ready', 'error');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);
    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id"              UUID             NOT NULL,
        "created_at"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "survey_inputs"   JSONB            NOT NULL,
        "persona_profile" JSONB,
        "letter"          TEXT,
        "status"          "SessionStatus"  NOT NULL DEFAULT 'pending',
        "chat_history"    JSONB            NOT NULL DEFAULT '[]',
        "error_message"   TEXT,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('[startup] sessions table ready');
  } catch (err) {
    console.error(`[startup] attempt ${attempt}/${MAX} failed: ${err.message}`);
    if (attempt < MAX) {
      setTimeout(() => ensureSchema(attempt + 1), 5000);
    } else {
      console.error('[startup] giving up — DB requests will fail');
    }
  } finally {
    await p.$disconnect();
  }
}
