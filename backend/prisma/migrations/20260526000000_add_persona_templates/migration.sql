-- CreateTable
CREATE TABLE "persona_templates" (
    "id"             SERIAL NOT NULL,
    "key"            TEXT NOT NULL,
    "labels"         TEXT[],
    "archetype"      TEXT NOT NULL,
    "speaking_style" TEXT NOT NULL,
    "verbal_quirks"  TEXT NOT NULL,
    "core_traits"    TEXT NOT NULL,
    "memory_topics"  TEXT NOT NULL,

    CONSTRAINT "persona_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persona_templates_key_key" ON "persona_templates"("key");
