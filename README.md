# TECHIN 510 Final Project
---

## Overview

## MOTS — Memory of the Soul

> *"Everyone carries words they never got to say."*

**MOTS** is a grief-tech web application that helps people find emotional closure by reconstructing the voice of a lost loved one from real conversation history. Users complete a short five-step survey and paste actual chat text; MOTS produces a deeply personal letter written *in the loved one's voice* — grounded in real memories, real tone, and real words — and enables ongoing dialogue that holds that voice steady across the entire session.

No sign-up required. No login wall. Just the conversation you never got to finish.

---

## What It Does

1. **Guided intake** — A five-step wizard collects names and nicknames, a core value, an emotional register ("Soul Weather"), a sample of real chat history for style extraction, and the words the user never got to say.
2. **Letter generation** — A single Gemini `generateContent()` call returns both a personal letter *and* a structured persona profile (speaking style, verbal quirks, extracted memories, tone) as structured JSON.
3. **In-character chat** — Gemini's `startChat()` loads the AI-generated persona profile as `systemInstruction`, locking the reconstructed personality in place for the entire session. Responses are kept short (1–3 sentences) to feel like texting, not a monologue.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (Vercel) |
| Backend | Node.js + Express.js (Render) |
| Database | PostgreSQL on Neon via Prisma ORM |
| AI | Google Gemini 2.5 Flash via `@google/generative-ai` |

All Gemini API calls are **server-side only**. No API keys are ever sent to the browser.

---

## Reference Prototype

A working prototype built at the Gemini 3 Hackathon is available at:
- Live app: [mots-phi.vercel.app](https://mots-phi.vercel.app)
- Devpost write-up: [devpost.com/software/mots](https://devpost.com/software/mots)

---

## Team

> **Course:** TECHIN510 | **Deliverables:** Client-00 (README) + Client-01 (SPEC.md)

| Role | Name |
|---|---|
| PM / Client | Wei Chang |
| Developer | Xirui Zhu |

**Agreed Development Fee:** *20. | Might change it later*

---

## Project Timeline

This project runs within the TECHIN510 quarter. **Demo Day is Week 10.** The developer and PM have agreed to the following milestones, anchored to course weeks:

### Check-in 1 — Architecture & Scaffolding (End of Week 6)

*Corresponds to developer's Architecture Pull Request (Developer-01). Client must review within 48 hours.*

**Required progress from developer:**
- Repository is initialised with the agreed folder structure (frontend + backend separated)
- Express.js server is running locally and deployable to Render
- Prisma schema is defined with the `sessions` table (UUID, JSONB fields for survey inputs, persona profile, letter, and chat history, and a status enum)
- Neon database is provisioned and connected
- Environment variables are documented in `.env.example` (no secrets committed)
- Initial Architecture Pull Request is open for PM review
- Landing page skeleton is live on Vercel (static HTML, no AI yet)

**PM obligation:** Client reviews and provides written feedback on the Architecture PR within **48 hours** of it being opened.

---

### Check-in 2 — Core AI Pipeline Working (End of Week 7)

**Required progress from developer:**
- Five-step survey form is complete with client-side validation
- `POST /api/sessions` route creates a UUID session and triggers async Phase 1 Gemini generation
- `GET /api/sessions/:id/status` polling endpoint returns letter and persona profile once ready
- Letter reveal screen renders with loading state and emotional reveal UI
- Phase 1 JSON output is correctly parsed (markdown fences stripped) and stored in the database
- PM can complete the full flow end-to-end: survey → loading state → letter display
- Developer responds to any client feedback within 48 hours

---

### Check-in 3 — Feature Complete & Demo-Ready (End of Week 9)

*One week before Demo Day — all features shipped, client can rehearse the demo.*

**Required progress from developer:**
- Phase 2 `startChat()` is implemented with persona loaded as `systemInstruction`
- Chat history normalisation is in place (user-role placeholder prepended per Gemini requirement)
- Chat UI is functional: user can send messages and receive 1–3 sentence in-character replies
- `maxOutputTokens: 300` and `temperature: 0.85` are configured
- Error states are handled gracefully across all screens
- Full user flow is tested end-to-end (landing → survey → letter → chat)
- All three screens are mobile-responsive
- Final deployment is live on Vercel (frontend) and Render (backend)
- Handoff documentation is complete so client can demo independently

---

### Demo Day — Week 10

- **Client (Xirui)** presents the final product at the demo fair
- GIX Bucks investment by all students happens simultaneously during Demo Day
- Client cannot invest in their own project or the project they developed as a developer
- All remaining GIX Bucks must be invested; net profit (investment received − 100) converts to bonus points

---

## Getting Started (Developer Setup)

```bash
# Clone the repo
git clone <repo-url>
cd mots

# Install backend dependencies
cd backend
npm install
cp .env.example .env  # Fill in GEMINI_API_KEY and DATABASE_URL

# Run database migrations
npx prisma migrate dev

# Start the backend
npm run dev

# In a separate terminal, open the frontend
cd ../frontend
# Open index.html in your browser or serve with a static server
```

---

## Environment Variables

```
GEMINI_API_KEY=       # Google Gemini API key (server-side only, never expose to client)
DATABASE_URL=         # Neon PostgreSQL connection string
PORT=3001             # Express server port
FRONTEND_ORIGIN=      # Vercel frontend URL (for CORS config)
```

---

## Project Structure (Expected)

```
mots/
├── frontend/
│   ├── index.html          # Landing page
│   ├── survey.html         # Five-step intake form
│   ├── letter.html         # Letter reveal + chat screen
│   ├── css/
│   └── js/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── sessions.js   # POST /api/sessions, GET /api/sessions/:id/status
│   │   │   └── chat.js       # POST /api/sessions/:id/chat
│   │   ├── services/
│   │   │   ├── gemini.js     # generateContent() + startChat() wrappers
│   │   │   └── persona.js    # JSON fence stripping + history normalisation
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env.example
└── README.md
```

---

## Out of Scope (MVP)

- Voice / audio output
- Multimodal image or screenshot upload
- Multi-user or shared memorial sessions
- User accounts or authentication
- Grief counselor integrations

---
