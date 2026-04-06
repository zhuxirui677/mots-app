# ARCHITECTURE.md — MOTS (Memory of the Soul)

**Course:** TECHIN510 | **Deliverable:** Developer-01
| Role | Name |
|---|---|
| PM / Client | Wei Chang |
| Developer | Xirui Zhu |

**Agreed Development Fee:** $20 (subject to revision)
**Reference Prototype:** [mots-phi.vercel.app](https://mots-phi.vercel.app) · [Devpost](https://devpost.com/software/mots)

---

## 1. Problem Summary

Grieving users want to address unsaid words to a lost person in a voice that feels specific to that relationship, grounded in real chat history they already possess. The product delivers: one guided intake → one AI generation step producing both a personal letter and a reusable persona profile → an ongoing chat session powered by that profile as a system instruction. No sign-up. No login.

---

## 2. Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript | Zero framework overhead for 3 screens; ships as static files to Vercel; no build step required |
| Backend | Node.js + Express.js | Matches reference implementation; straightforward async/await; first-class `@google/generative-ai` SDK support |
| Database | PostgreSQL on Neon | Serverless-friendly; JSONB columns absorb schema evolution without migrations every sprint |
| ORM | Prisma | Type-safe queries; migration history; schema-as-code |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) | `generateContent` for structured JSON letter + persona; `startChat` with `systemInstruction` for session-consistent voice; Flash tier balances cost and latency |
| Hosting (frontend) | Vercel | CDN-native static delivery; zero-config deploy from GitHub |
| Hosting (backend) | Render | Persistent Node process; env-var management; easy GitHub deploy |

All Gemini API calls are **server-side only**. The browser never sees the API key.

---

## 3. Data Model

### `sessions` table

```sql
CREATE TABLE sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- All five survey fields stored together (shape can evolve without a migration)
  survey_inputs   JSONB       NOT NULL,
  -- {
  --   deceasedName:     string,
  --   deceasedNickname: string,
  --   userName:         string,
  --   corePrinciple:    "Radical Honesty" | "Unconditional Kindness"
  --                   | "Unbound Freedom" | "Absolute Perfection",
  --   soulWeather:      "Morning Sun" | "Midnight Rain"
  --                   | "Wild Wind" | "Winter Fire",
  --   chatSample:       string,   -- pasted raw conversation text
  --   unsaidWords:      string
  -- }

  -- AI outputs
  status          TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'ready' | 'error'
  letter          TEXT,
  persona_profile JSONB,
  -- {
  --   systemInstruction: string,   -- loaded directly into startChat()
  --   speakingStyle:     string,
  --   quirks:            string[],
  --   values:            string[],
  --   memories:          string[],
  --   tone:              string
  -- }

  -- Full Gemini chat history (persisted after every turn)
  chat_history    JSONB       NOT NULL DEFAULT '[]'
  -- [{role: "user"|"model", parts: [{text: string}]}]
);
```

**One table, no joins.** JSONB absorbs the persona, survey inputs, and chat history. No second table is needed at MVP.

Prisma schema maps to this exactly. Status values are enforced at the application layer (Zod) rather than a Postgres enum to avoid migration friction.

---

## 4. Application Screens

```
Landing        (index.html)
  └── Survey   (survey.html)    — five-step wizard
        └── Letter + Chat  (letter.html)   — reveal + ongoing dialogue
```

### 4.1 Landing (`index.html`)

Atmospheric copy, core value proposition, single "Begin" CTA. No auth, no tracking. Mobile-responsive.

### 4.2 Survey (`survey.html`) — five steps, one at a time

| Step | Field | Input type |
|---|---|---|
| 1 | Names & Nicknames | Two text inputs: loved one's name + what they called the user |
| 2 | Core Principle | 4-option selector: **Radical Honesty / Unconditional Kindness / Unbound Freedom / Absolute Perfection** |
| 3 | Soul Weather | 4-option selector: **Morning Sun / Midnight Rain / Wild Wind / Winter Fire** |
| 4 | Chat History | Large `<textarea>` — paste raw conversation text from any platform |
| 5 | Unsaid Words | `<textarea>` — what the user never got to say |

Progress indicator shows current step. All five fields required before submission. Submit → `POST /api/sessions` → receives `{ sessionId }` → UUID stored in `localStorage` → redirect to `letter.html?id=<sessionId>`.

### 4.3 Letter + Chat (`letter.html`)

- On load, reads UUID from `localStorage`; polls `GET /api/sessions/:id/status` every **2 seconds**
- While polling: atmospheric loading copy ("Connecting to their soul…")
- On `status === 'ready'`: reveals letter with **"1 NEW MESSAGE"** emotional reveal UI
- "Continue the Conversation" button expands the chat panel
- Each user message → `POST /api/sessions/:id/chat`; reply appended to thread
- Chat input disabled while awaiting reply; re-enabled on response

---

## 5. API Design

All routes under `/api`. All Gemini calls remain server-side.

| Method | Path | Handler file | Description |
|---|---|---|---|
| `POST` | `/api/sessions` | `routes/sessions.js` | Validate inputs (Zod), insert row with `status: 'pending'`, fire async Phase 1 generation, return `{ sessionId }` |
| `GET` | `/api/sessions/:id/status` | `routes/sessions.js` | Return `{ status, letter }` — polled every 2 s by frontend |
| `POST` | `/api/sessions/:id/chat` | `routes/chat.js` | Accept `{ text }`, reconstruct `startChat` from stored history, send message, persist updated history, return `{ reply }` |

No authentication endpoints. The UUID is the session's only key — knowing it grants access, which is intentional for frictionless grief support at MVP.

---

## 6. Two-Step Gemini Workflow

### Phase 1 — `generateContent` (letter + persona profile)

Triggered **asynchronously** immediately after the session row is inserted (fire-and-forget from the `POST /api/sessions` handler). Implemented in `services/gemini.js`; fence stripping and JSON parsing live in `services/persona.js`.

**Prompt structure:**

```
You are a compassionate AI helping someone process grief.
Given the information below, return VALID JSON only — no markdown fences, no prose outside the object.

Required JSON schema:
{
  "letter":             "<200–300 words written in the deceased's voice, addressing the user's unsaid words>",
  "systemInstruction":  "<condensed persona paragraph to load as a chat system prompt>",
  "speakingStyle":      "<string>",
  "quirks":             ["<string>"],
  "values":             ["<string>"],
  "memories":           ["<string extracted from chatSample>"],
  "tone":               "<string>"
}

--- INPUTS ---
Deceased name / nickname : {deceasedName} / {deceasedNickname}
User name                : {userName}
Core Principle           : {corePrinciple}
Soul Weather             : {soulWeather}
Chat sample              : {chatSample}
Unsaid words             : {unsaidWords}
```

`services/persona.js` strips any accidental ` ```json ` fences with a regex before `JSON.parse`. On success: update row `letter`, `persona_profile`, `status = 'ready'`. On error: `status = 'error'`.

### Phase 2 — `startChat` (in-character chat)

Implemented in `routes/chat.js`, calling `services/gemini.js`.

```js
const chat = model.startChat({
  systemInstruction: session.persona_profile.systemInstruction,
  history: normalizeHistory(session.chat_history),
  generationConfig: {
    maxOutputTokens: 300,   // ~1–3 sentences; keeps the texting register
    temperature: 0.85,
  },
});
const result = await chat.sendMessage(userText);
```

**History normalization** (`services/persona.js`): Gemini requires the history array to begin with a `user` role turn. If `chat_history` is empty, an empty array is passed. If a `model` turn is first due to an edge case, a minimal user placeholder is prepended. After each reply the full `chat_history` is replaced in the DB atomically (JSONB column overwrite, not append).

The API server is stateless — no in-memory chat objects live between HTTP requests. Every call to `POST /api/sessions/:id/chat` reconstructs `startChat` from the DB-persisted history.

---

## 7. Agentic Engineering Plan

Phases map to the agreed course check-in milestones.

### Phase 1 — Foundation · End of Week 6 (Check-in 1)

| # | Task |
|---|---|
| [#1](../../issues/1) | Initialise repo: `frontend/` + `backend/` folder structure |
| [#1](../../issues/1) | Express server running locally and deployable to Render |
| [#1](../../issues/1) | Prisma schema defined (`sessions` table per §3), `npx prisma migrate dev` |
| [#1](../../issues/1) | Neon database provisioned and `DATABASE_URL` wired |
| [#1](../../issues/1) | `.env.example` documented; no secrets committed |
| [#2](../../issues/2) | Landing page skeleton live on Vercel (static HTML, no AI) |

*PM reviews Architecture PR within 48 hours of opening.*

### Phase 2 — AI Core · End of Week 7 (Check-in 2)

| # | Task |
|---|---|
| [#3](../../issues/3) | Five-step wizard with client-side validation; `POST /api/sessions` wired |
| [#4](../../issues/4) | `generateContent` route; prompt engineering; JSON fence stripping; DB write |
| [#5](../../issues/5) | Polling endpoint `GET /api/sessions/:id/status`; loading state on frontend |
| [#5](../../issues/5) | "1 NEW MESSAGE" letter reveal UI |

*PM can complete full flow end-to-end after this check-in.*

### Phase 3 — Feature Complete · End of Week 9 (Check-in 3)

| # | Task |
|---|---|
| [#6](../../issues/6) | `startChat` with persona as `systemInstruction`; history normalisation; DB persistence |
| [#7](../../issues/7) | Chat UI: message thread, send button, input disabled during await |
| [#8](../../issues/8) | Error state handling across all screens (generation failure, chat failure) |
| [#8](../../issues/8) | Full end-to-end test: landing → survey → letter → chat |
| [#8](../../issues/8) | Mobile-responsive layout on all three screens |
| [#8](../../issues/8) | Final Vercel + Render deployment; handoff docs for client demo |

### Phase 4 — Demo Day · Week 10

Client (Xirui) presents the live product at the TECHIN510 demo fair. All GIX Bucks investment and grading occurs simultaneously.

### Deferred (post-MVP)

- Voice / audio letter output
- Multimodal image or screenshot upload
- Multi-user / shared memorial sessions
- User accounts and authentication
- Grief counselor integrations

---

## 8. GitHub Issues

| # | Title | Phase |
|---|---|---|
| 1 | Setup: project scaffolding and environment | 1 |
| 2 | Landing page UI | 1 |
| 3 | Five-step intake survey | 2 |
| 4 | Phase 1 AI — letter and persona generation | 2 |
| 5 | Letter reveal screen with polling | 2 |
| 6 | Phase 2 AI — in-character chat | 3 |
| 7 | Chat UI | 3 |
| 8 | End-to-end testing and polish | 3 |

---

## 9. Security Posture

| Concern | Mitigation |
|---|---|
| API key exposure | `GEMINI_API_KEY` stored in Render env vars only; never bundled with frontend |
| Prompt injection via `chatSample` | User content wrapped in delimited `--- INPUTS ---` block; never interpolated into instruction positions |
| Session enumeration | UUID v4 (random 122-bit entropy); no sequential IDs; no list endpoint |
| Runaway API spend | Per-session rate limit via `express-rate-limit`; `maxOutputTokens: 300` cap on every chat call |
| PII at rest | `chatSample` and `unsaidWords` stored in DB — privacy notice required; no external logging of field contents |

---

## 10. Repository Layout

```
mots/
├── frontend/
│   ├── index.html          # Landing page
│   ├── survey.html         # Five-step intake wizard
│   ├── letter.html         # Letter reveal + chat screen
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── survey.js       # Wizard logic, form submission
│       └── letter.js       # Polling, letter reveal, chat thread
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.js            # App entry, middleware, CORS
│   │   ├── routes/
│   │   │   ├── sessions.js     # POST /api/sessions, GET /api/sessions/:id/status
│   │   │   └── chat.js         # POST /api/sessions/:id/chat
│   │   └── services/
│   │       ├── gemini.js       # generateContent() + startChat() wrappers
│   │       └── persona.js      # JSON fence stripping + history normalisation
│   └── .env.example
├── ARCHITECTURE.md
└── README.md
```

---

## 11. Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://...          # Neon connection string
GEMINI_API_KEY=AIza...                 # Google Gemini API key — server only
PORT=3001
FRONTEND_ORIGIN=https://mots-phi.vercel.app   # CORS allowlist
```

---

## 12. Estimated Hour Budget

| Phase | Check-in | Hours |
|---|---|---|
| Foundation | Week 6 | 10 |
| AI Core | Week 7 | 15 |
| Feature Complete | Week 9 | 20 |
| Polish + Deploy | Week 10 | 10 |
| **Total** | | **55** |

Within the agreed 40–60 hour MVP window. The Deferred list above marks the boundary of `complexity:medium`; adding any item from it moves the project to `complexity:ambitious`.
