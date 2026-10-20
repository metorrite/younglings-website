/**
 * English dashboard text by key: the source of truth for the dashboard's translations (see JonnyBot docs/TRANSLATION.md).
 * Placeholders are {0}, {1}, ... filled in order. Only the Language page uses this so far; moving the rest is a separate ticket.
 */
export const en = {
  "dashboard.language.title": "Language",
  "dashboard.language.description": "The language JonnyBot uses for its messages in this server.",
  "dashboard.language.panel": "Messages",
  "dashboard.language.field": "JonnyBot's language",
  "dashboard.language.hint": "Where a message is not translated yet, JonnyBot uses English.",
  "dashboard.language.only": "English is the only language for now. More will show here as they are added.",
  "dashboard.language.saved": "Saved.",
} as const;

export type MessageKey = keyof typeof en;
