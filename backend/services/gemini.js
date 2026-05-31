/**
 * gemini.js — MOTS AI service (powered by Claude / Anthropic)
 *
 * Two exported functions:
 *   generateLetterAndProfile(surveyInputs, template) → { letter, personaProfile }
 *   chatReply(personaProfile, history, userMessage)  → string
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LETTER_MODEL = 'claude-sonnet-4-6';
const CHAT_MODEL   = 'claude-haiku-4-5-20251001';

function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

// ── Step 1: generate letter + persona profile ─────────────────

const LETTER_SYSTEM = `
You are a compassionate AI helping a grieving person hear one more letter from someone they lost.
You will receive a JSON object with information the user provided about their loved one.
You must return ONLY valid JSON — no markdown fences, no extra text — in exactly this shape:

{
  "letter": "<the full personal letter, 3-5 paragraphs, written AS the deceased person TO the user>",
  "persona": {
    "speakingStyle": "<short description of how they spoke: rhythm, formality, punctuation habits>",
    "verbalQuirks": "<verbal tics, favourite phrases, emoji habits, signature sign-offs, etc.>",
    "values": "<what mattered most to them, 1-2 sentences>",
    "memories": "<2-3 specific memories or topics they would naturally reference>",
    "emotionalTone": "<one of: reserved / warm / effusive>",
    "systemPromptText": "<2-4 sentence instruction block used as system prompt for follow-up chat, written in second person as 'You are ...' — capture voice, quirks, and emotional register>"
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

async function generateLetterAndProfile(survey, template = null) {
  let userPrompt = `Here is the user's survey input:\n${JSON.stringify(survey, null, 2)}`;

  if (template) {
    userPrompt += `

ARCHETYPAL BASELINE — relationship type matched: "${template.key}"
Use the following as a realistic foundation. Let the specific survey data above
override and personalise every detail — these are defaults, not constraints.

- Archetype: ${template.archetype}
- Typical speaking style: ${template.speaking_style}
- Common verbal quirks: ${template.verbal_quirks}
- Core personality traits: ${template.core_traits}
- Typical memory topics: ${template.memory_topics}`;
  }

  const response = await client.messages.create({
    model:      LETTER_MODEL,
    max_tokens: 1800,
    system:     LETTER_SYSTEM,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const raw   = response.content[0].text;
  const clean = stripFences(raw);

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`Claude returned invalid JSON: ${clean.slice(0, 200)}`);
  }

  if (!parsed.letter || !parsed.persona) {
    throw new Error('Claude response missing letter or persona fields');
  }

  return {
    letter:         parsed.letter,
    personaProfile: parsed.persona,
  };
}

// ── Step 2: follow-up chat ────────────────────────────────────

async function chatReply(personaProfile, history, userMessage) {
  const messages = [];

  if (!history.length) {
    messages.push({ role: 'user',      content: 'I read your letter.' });
    messages.push({ role: 'assistant', content: "I'm glad you did." });
  } else {
    for (const turn of history) {
      messages.push({
        role:    turn.role === 'model' ? 'assistant' : 'user',
        content: turn.parts[0].text,
      });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model:      CHAT_MODEL,
    max_tokens: 220,
    system:     personaProfile.systemPromptText,
    messages,
  });

  return response.content[0].text.trim();
}

module.exports = { generateLetterAndProfile, chatReply };
