/**
 * routes/sessions.js
 *
 * POST   /sessions              — create session, kick off Gemini letter generation
 * GET    /sessions/:id          — poll status (pending / ready / error)
 * POST   /sessions/:id/chat     — send a follow-up message, get in-voice reply
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateLetterAndProfile, chatReply } = require('../services/gemini');
const { matchTemplate } = require('../services/templateMatcher');

const router  = express.Router();
const prisma  = new PrismaClient();

// ── POST /sessions ────────────────────────────────────────────
// Body: { name, nickname, pronouns, relationship, coreValue,
//         emotionalWeather, thingsNeverSaid, chatSample }
router.post('/', async (req, res) => {
  const {
    name, nickname, pronouns, relationship,
    coreValue, emotionalWeather,
    thingsNeverSaid, chatSample,
  } = req.body;

  if (!name || !nickname || !coreValue || !emotionalWeather || !thingsNeverSaid) {
    return res.status(400).json({
      error: 'name, nickname, coreValue, emotionalWeather, and thingsNeverSaid are required',
    });
  }

  const surveyInputs = {
    name, nickname, pronouns, relationship,
    coreValue, emotionalWeather,
    thingsNeverSaid,
    chatSample: chatSample || '',
  };

  // Create session in DB with status=pending
  const session = await prisma.session.create({
    data: { survey_inputs: surveyInputs, status: 'pending' },
  });

  // Kick off Gemini generation in the background (don't await)
  setImmediate(() => _runGeneration(session.id, surveyInputs));

  return res.status(202).json({ id: session.id, status: 'pending' });
});

// ── GET /sessions/:id/status ──────────────────────────────────
// Lightweight poll endpoint — returns only { status, letter }.
// Used by the frontend polling loop; never exposes survey data or persona.
router.get('/:id/status', async (req, res) => {
  const session = await prisma.session.findUnique({
    where:  { id: req.params.id },
    select: { status: true, letter: true },
  });

  if (!session) return res.status(404).json({ error: 'Session not found' });

  return res.json({ status: session.status, letter: session.letter ?? null });
});

// ── GET /sessions/:id ─────────────────────────────────────────
// Returns status + letter once ready.
router.get('/:id', async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, status: true, letter: true,
      created_at: true, error_message: true,
    },
  });

  if (!session) return res.status(404).json({ error: 'Session not found' });

  return res.json(session);
});

// ── POST /sessions/:id/chat ───────────────────────────────────
// Body: { message: string }
router.post('/:id/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const session = await prisma.session.findUnique({
    where:  { id: req.params.id },
    select: { id: true, status: true, persona_profile: true, chat_history: true },
  });

  if (!session)           return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'ready') {
    return res.status(409).json({ error: 'Letter not ready yet' });
  }

  const history = Array.isArray(session.chat_history) ? session.chat_history : [];

  // Call Gemini chat
  const reply = await chatReply(session.persona_profile, history, message.trim());

  // Append both turns to history and persist
  const updatedHistory = [
    ...history,
    { role: 'user',  parts: [{ text: message.trim() }] },
    { role: 'model', parts: [{ text: reply }] },
  ];

  await prisma.session.update({
    where: { id: session.id },
    data:  { chat_history: updatedHistory },
  });

  return res.json({ reply });
});

// ── Internal: run Gemini generation and update DB ─────────────
async function _runGeneration(sessionId, surveyInputs) {
  try {
    // Look up archetype template — enriches the Gemini prompt with baseline traits.
    // Returns null gracefully if no match or DB unavailable.
    const template = await matchTemplate(surveyInputs.relationship);
    if (template) {
      console.log(`[session ${sessionId}] Matched persona template: ${template.key}`);
    }

    const { letter, personaProfile } = await generateLetterAndProfile(surveyInputs, template);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status:          'ready',
        letter,
        persona_profile: personaProfile,
      },
    });
  } catch (err) {
    console.error(`[session ${sessionId}] Gemini generation failed:`, err.message);
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status:        'error',
        error_message: err.message,
      },
    });
  }
}

module.exports = router;
