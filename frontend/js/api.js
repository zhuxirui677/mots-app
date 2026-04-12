/**
 * api.js — thin wrapper around the MOTS backend API
 *
 * Usage:
 *   import { createSession, pollSession, sendChat } from './api.js';
 *
 * The backend URL is read from window.MOTS_API (set in a <script> block
 * at the top of each page) so it's easy to switch dev ↔ production:
 *
 *   <script>window.MOTS_API = 'http://localhost:3001';</script>
 *
 * In production Vercel sets it via an env var injected at build time,
 * or you can hardcode the Render URL here once it's stable.
 */

const BASE = () =>
  (window.MOTS_API || 'http://localhost:3001').replace(/\/$/, '');

/**
 * POST /api/sessions
 * @param {object} surveyData  — { name, pronouns, relationship, coreValue,
 *                                 emotionalWeather, thingsNeverSaid, chatSample }
 * @returns {Promise<{ id: string, status: 'pending' }>}
 */
async function createSession(surveyData) {
  const res = await fetch(`${BASE()}/api/sessions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(surveyData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * GET /api/sessions/:id
 * @returns {Promise<{ id, status: 'pending'|'ready'|'error', letter?, error_message? }>}
 */
async function pollSession(id) {
  const res = await fetch(`${BASE()}/api/sessions/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Poll until status !== 'pending', with exponential back-off.
 * Calls onTick(attempt) every poll so UI can show a progress indicator.
 *
 * @param {string}   id
 * @param {Function} onTick   — optional, called with attempt count
 * @param {number}   maxWait  — max total ms to wait (default 90 s)
 */
async function waitForLetter(id, onTick, maxWait = 90_000) {
  const started = Date.now();
  let attempt   = 0;

  while (Date.now() - started < maxWait) {
    attempt++;
    if (onTick) onTick(attempt);

    const session = await pollSession(id);
    if (session.status === 'ready') return session;
    if (session.status === 'error') throw new Error(session.error_message || 'Generation failed');

    // Exponential back-off: 1s, 1.5s, 2s, 2.5s … cap at 4s
    const delay = Math.min(1000 + attempt * 500, 4000);
    await new Promise((r) => setTimeout(r, delay));
  }

  throw new Error('Timed out waiting for letter — please try again.');
}

/**
 * POST /api/sessions/:id/chat
 * @param {string} id
 * @param {string} message
 * @returns {Promise<{ reply: string }>}
 */
async function sendChat(id, message) {
  const res = await fetch(`${BASE()}/api/sessions/${id}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Expose as globals for vanilla JS pages (no bundler needed)
window.MotsAPI = { createSession, pollSession, waitForLetter, sendChat };
