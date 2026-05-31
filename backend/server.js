require('dotenv').config();

const { exec } = require('child_process');
const app  = require('./app');
const PORT = process.env.PORT || 3001;

// Start the HTTP server immediately so Render's health check passes right away.
// Migrations run asynchronously with retries so Neon DB has time to wake up.
app.listen(PORT, () => {
  console.log(`MOTS backend listening on port ${PORT}`);
  console.log(`CORS allowed origin: ${process.env.FRONTEND_ORIGIN}`);
  runMigrations(1);
});

function runMigrations(attempt) {
  const MAX = 15;
  console.log(`[migrate] attempt ${attempt}/${MAX}`);
  exec('npx prisma migrate deploy', (err, stdout, stderr) => {
    if (!err) {
      console.log('[migrate] done');
      exec('npx prisma db seed', () => {});
      return;
    }
    console.error(`[migrate] attempt ${attempt} failed: ${stderr || err.message}`);
    if (attempt < MAX) {
      setTimeout(() => runMigrations(attempt + 1), 5000);
    } else {
      console.error('[migrate] all attempts exhausted — DB requests will fail until redeploy');
    }
  });
}
