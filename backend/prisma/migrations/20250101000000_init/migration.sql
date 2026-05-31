-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('pending', 'ready', 'error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "sessions" (
    "id"              UUID        NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "survey_inputs"   JSONB        NOT NULL,
    "persona_profile" JSONB,
    "letter"          TEXT,
    "status"          "SessionStatus" NOT NULL DEFAULT 'pending',
    "chat_history"    JSONB        NOT NULL DEFAULT '[]',
    "error_message"   TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
