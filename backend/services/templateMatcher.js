/**
 * templateMatcher.js
 *
 * Matches a free-text relationship string (e.g. "my grandma", "best friend",
 * "老公") to a PersonaTemplate row in the database.
 *
 * Falls back gracefully — returns null if no match or DB is unavailable.
 * The caller (sessions.js) passes null to generateLetterAndProfile(), which
 * then runs without archetype enrichment.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @param {string|undefined} relationship  — free text from survey Step 1
 * @returns {Promise<object|null>}          — PersonaTemplate row or null
 */
async function matchTemplate(relationship) {
  if (!relationship || !relationship.trim()) return null;

  const rel = relationship.toLowerCase().trim();

  try {
    // Load all templates (small table, ~10 rows — fine to load in full)
    const templates = await prisma.personaTemplate.findMany();

    for (const template of templates) {
      for (const label of template.labels) {
        if (rel.includes(label.toLowerCase())) {
          return template;
        }
      }
    }

    return null; // no match — caller will generate without archetype
  } catch (err) {
    // DB unavailable or table missing — degrade gracefully
    console.warn('[templateMatcher] Could not query persona_templates:', err.message);
    return null;
  }
}

module.exports = { matchTemplate };
