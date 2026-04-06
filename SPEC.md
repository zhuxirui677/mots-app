# SPEC.md — MOTS (Memory of the Soul)

> **Deliverable:** Client-01 | TECHIN510 Final Project

## Project Overview

**MOTS** is a grief-tech web application that helps people find emotional closure by reconstructing the voice of a lost loved one from real chat history. Users complete a five-field survey and paste actual conversation text; the app produces a deeply personal letter in the loved one's voice and enables ongoing dialogue that maintains that voice across the entire session.

- **Client / PM:** Wei Chang
- **Developer:** Xirui Zhu
- **Agreed Development Fee:** 20 | Might adjust later*
- **Reference Prototype:** [mots-phi.vercel.app](https://mots-phi.vercel.app) | [Devpost](https://devpost.com/software/mots)

---

## User Stories

### US-01 — Landing Page
> As a grieving user, I want to land on an emotionally safe, atmospheric page that clearly explains what MOTS does, so I feel invited to begin the process without confusion or pressure.

**Acceptance Criteria:**
- Page communicates the core value proposition in plain language
- A clear "Begin" or "Start" CTA button is present
- No sign-up wall or login required
- Page is mobile-responsive

---

### US-02 — Five-Step Intake Survey
> As a user, I want to fill out a guided five-step form about my loved one, so the app can build a personalised reconstruction of their voice.

**Acceptance Criteria:**
- Step 1: Names & Nicknames — both the loved one's name and what they called the user
- Step 2: Core Principle — user selects one of four values (Radical Honesty / Unconditional Kindness / Unbound Freedom / Absolute Perfection)
- Step 3: Soul Weather — user selects one of four emotional registers (Morning Sun / Midnight Rain / Wild Wind / Winter Fire)
- Step 4: Chat History — large text area for pasting raw conversation text
- Step 5: Unsaid Words — text area for what the user never got to say
- Form validates that all five fields are completed before submission
- Each step is shown one at a time (wizard-style) with a progress indicator

---

### US-03 — Letter Generation with Loading State
> As a user, I want to see a meaningful loading screen while my letter is being generated, so the wait feels intentional rather than broken.

**Acceptance Criteria:**
- On survey submission, a loading state is shown (e.g., "Connecting to their soul…")
- Backend triggers an async `generateContent()` call to Gemini
- Frontend polls the backend every 2 seconds until the letter is ready
- Letter and persona profile are returned as structured JSON and stored in the database
- The letter is revealed with a "1 NEW MESSAGE" or equivalent emotional reveal UI

---

### US-04 — Personal Letter Display
> As a user, I want to read a letter written in my loved one's voice, so I can hear the words I never got to receive.

**Acceptance Criteria:**
- Letter is displayed in a clean, readable format
- Letter references memories from the pasted chat history
- Letter responds to the unsaid words provided by the user
- Letter matches the speaking style, slang, and nicknames from the chat history
- A "Continue the Conversation" button transitions to the chat screen

---

### US-05 — Persistent In-Character Chat
> As a user, I want to continue a conversation with the reconstructed personality after reading the letter, so I can say the things I never got to say.

**Acceptance Criteria:**
- Chat uses the same persona profile from the letter generation as the `systemInstruction`
- Responses stay in character across multiple turns (no drift)
- Responses are short (1–3 sentences, max ~300 tokens)
- The loved one's verbal quirks, nicknames, and emotional tone carry through
- The AI never breaks character or acknowledges being an AI
- Chat history is maintained server-side using Gemini's `startChat()` history management

---

### US-06 — Session Persistence (No Login)
> As a user, I do not want to create an account, so I can access the emotional experience immediately without friction.

**Acceptance Criteria:**
- A UUID session is created on first visit
- Session data (persona profile, letter, chat history) is stored in the database under that UUID
- UUID is stored in the browser (e.g., localStorage or cookie) so the session persists on refresh
- No email, password, or personal account is ever required

---

### US-07 — Server-Side AI (Security)
> As a user, I trust that my private chat history and personal data are never exposed on the client side.

**Acceptance Criteria:**
- All Gemini API calls are made server-side only
- The Gemini API key is never sent to or visible in the browser
- Pasted chat history and persona profiles are stored only in the database, not in client state
- CORS and environment variables are correctly configured on the backend

---

## Desired Technical Specifications

### Architecture

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (Vercel) |
| Backend | Node.js + Express.js (Render) |
| Database | PostgreSQL on Neon via Prisma ORM |
| AI | Google Gemini via `@google/generative-ai` |

### Database Schema (1–2 tables)

**`sessions` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, generated on session creation |
| `created_at` | Timestamp | Auto-set |
| `survey_inputs` | JSONB | All five form fields |
| `persona_profile` | JSONB | AI-generated personality profile and system prompt |
| `letter` | Text | AI-generated letter |
| `status` | Enum | `pending` / `ready` / `error` |
| `chat_history` | JSONB | Running Gemini chat history array |

### AI Pipeline

**Phase 1 — `generateContent()`:**
- Input: All five survey fields as a structured prompt
- Output: A JSON object containing (a) the letter text and (b) a full persona profile including speaking style, verbal quirks, values, extracted memories, emotional tone, and a complete system prompt string
- Backend strips `\`\`\`json` markdown fences before parsing
- Stored in the `sessions` table under `persona_profile` and `letter`

**Phase 2 — `startChat()`:**
- `systemInstruction` loaded from the stored `persona_profile`
- History normalised to begin with a user-role placeholder turn (Gemini requirement)
- `maxOutputTokens: 300`
- `temperature: 0.85`
- Chat history managed by Gemini's built-in `startChat()` history; the full history array is persisted to the database after each turn

### Non-Functional Requirements

- All API keys stored as environment variables, never committed to the repository
- Frontend polls letter generation status at 2-second intervals
- Mobile-responsive layout for all three screens
- Graceful error states: failed generation shows a user-friendly message, not a raw error
- JSON fence stripping before parse to handle Gemini markdown wrapping

---

## Out of Scope for MVP

The following features are explicitly **not** included in the MVP and should not be built unless separately scoped:

- Voice / audio output
- Multimodal image or screenshot upload
- Multi-user / shared memorial sessions
- Integration with grief counselors
- User accounts, authentication, or social features
- Multiple loved one profiles per session

---

## GitHub Issues Decomposition

The following issues should be opened in the project repository:

| # | Title | Description |
|---|---|---|
| 1 | **Setup: Project scaffolding and environment** | Initialise Node.js + Express backend, Vercel frontend, Neon PostgreSQL, Prisma schema, environment variables, CORS config, and deployment pipelines. |
| 2 | **Landing page UI** | Build the atmospheric landing page with headline, product description, and "Begin" CTA button. Must be mobile-responsive. |
| 3 | **Five-step intake survey** | Implement the wizard-style survey with validation for all five fields. Wire form submission to POST `/api/sessions`. |
| 4 | **Phase 1 AI — Letter and persona generation** | Implement the `generateContent()` server route. Prompt engineering for structured JSON output. Strip JSON fences. Store result in DB. Return session UUID to client. |
| 5 | **Letter reveal screen with polling** | Frontend polls `GET /api/sessions/:id/status` every 2s. Render loading state, then reveal letter with emotional UI. |
| 6 | **Phase 2 AI — In-character chat** | Implement `startChat()` with persona as `systemInstruction`. Build chat API route. Normalise history for Gemini. Persist history to DB. |
| 7 | **Chat UI** | Build the chat screen. Display incoming messages in the loved one's "voice style." Input box, send button, streaming or polling for replies. |
| 8 | **End-to-end testing and polish** | Full user flow test (landing → survey → letter → chat). Error state handling. Mobile responsiveness check. Final deployment review. |
