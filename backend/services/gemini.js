/**
 * gemini.js — MOTS Gemini service
 *
 * Model: gemini-2.0-flash   (fast, high quality, supports systemInstruction)
 * All calls are server-side only. The API key never reaches the browser.
 *
 * Two exported functions:
 *   generateLetterAndProfile(surveyInputs)  → { letter, personaProfile }
 *   chatReply(personaProfile, history, userMessage) → string
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Model ─────────────────────────────────────────────────────
// gemini-2.0-flash: fast, cheap, supports systemInstruction + JSON mode
const MODEL = 'gemini-2.0-flash';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Strip markdown code fences that Gemini sometimes wraps around JSON.
 * e.g.  ```json\n{...}\n```  →  {...}
 */
function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/,        '')
    .trim();
}

// ── Step 1: generate letter + persona profile ─────────────────

const LETTER_SYSTEM = `
You are a compassionate AI helping a grieving person hear one more letter from someone they lost.
You will receive a JSON object with information the user provided about their loved one.
You must return ONLY valid JSON — no markdown fences, no extra text — in exactly this shape:

{
  "letter": "<the full personal letter, 3-5 paragraphs, written AS the deceased person TO the user>",
  "personaProfile": {
    "speakingStyle": "<short description of how they spoke: rhythm, formality, punctuation habits>",
    "verbalQuirks": "<verbal tics, favourite phrases, emoji habits, signature sign-offs, etc.>",
    "values": "<what mattered most to them, 1-2 sentences>",
    "memories": "<2-3 specific memories or topics they would naturally reference>",
    "emotionalTone": "<one of: reserved / warm / effusive>",
    "systemPromptText": "<2-4 sentence instruction block used as systemInstruction for follow-up chat, written in second person as 'You are ...' — capture voice, quirks, and emotional register>"
  }
}

Guidelines for the letter:
- Write AS the deceased person speaking TO the grieving user.
- Use the speaking style, nicknames, and phrases from the provided chat sample.
- Address the specific "things never said" the user shared.
- Keep emotional tone proportional — warm and specific, not overwrought.
- Do NOT claim the person is literally alive or back; the tone is "a letter they might have written".
- Do NOT add any text outside the JSON object.
`.trim();

/**
 * @param {object} survey  — shape: { name, pronouns, relationship,
 *                            coreValue, emotionalWeather,
 *                            thingsNeverSaid, chatSample }
 * @returns {{ letter: string, personaProfile: object }}
 */
async function generateLetterAndProfile(survey) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: LETTER_SYSTEM,
    generationConfig: {
      temperature:     0.85,
      maxOutputTokens: 1800,
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Here is the user's survey input:\n${JSON.stringify(survey, null, 2)}`;

  const result = await model.generateContent(prompt);
  const raw    = result.response.text();
  const clean  = stripFences(raw);

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`Gemini returned invalid JSON: ${clean.slice(0, 200)}`);
  }

  if (!parsed.letter || !parsed.personaProfile) {
    throw new Error('Gemini response missing letter or personaProfile fields');
  }

  return {
    letter:        parsed.letter,
    personaProfile: parsed.personaProfile,
  };
}

// ── Step 2: follow-up chat ────────────────────────────────────

/**
 * Send one user message and receive one short in-voice reply.
 *
 * @param {object} personaProfile  — from Step 1
 * @param {Array}  history         — Gemini history format:
 *                                   [{ role: 'user'|'model', parts: [{ text }] }]
 * @param {string} userMessage
 * @returns {string} the model's reply text
 */
async function chatReply(personaProfile, history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: personaProfile.systemPromptText,
    generationConfig: {
      temperature:     0.85,
      maxOutputTokens: 220,   // keep replies short — 1-3 sentences
    },
  });

  // Gemini requires history to start with a user turn.
  // If history is empty, seed it with a short placeholder.
  let safeHistory = history;
  if (!history.length || history[0].role !== 'user') {
    safeHistory = [
      { role: 'user',  parts: [{ text: 'I read your letter.' }] },
      { role: 'model', parts: [{ text: 'I\'m glad you did.' }] },
      ...history,
    ];
  }

  const chat = model.startChat({ history: safeHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text().trim();
}

module.exports = { generateLetterAndProfile, chatReply };
