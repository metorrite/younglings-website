import { en, type MessageKey } from "./messages.en";

export type { MessageKey } from "./messages.en";

export const DEFAULT_LANGUAGE = "en";

/**
 * Language packs by code, each a (possibly partial) copy of the English messages. A new language is one file `messages.<code>.ts`
 * registered here; a key a pack lacks falls back to English. None ships yet.
 */
const packs: Record<string, Partial<Record<MessageKey, string>>> = { en };

/** The text for a key in a language, English when that language has no such key, filled with {0}, {1}, ... in order. */
export function t(language: string, key: MessageKey, ...args: (string | number)[]): string {
  const template = packs[language]?.[key] ?? en[key];
  return args.reduce<string>((text, arg, i) => text.split(`{${i}}`).join(String(arg)), template);
}

/** All the messages of one language resolved to plain text, for handing to a client component (which cannot read the server's language itself). */
export function messagesFor<K extends MessageKey>(language: string, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, t(language, key)])) as Record<K, string>;
}
