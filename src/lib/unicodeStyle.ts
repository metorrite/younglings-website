/**
 * Bold text for places Discord shows as plain text (an embed's footer and author line ignore `**markdown**` and would show the
 * asterisks). Mathematical sans-serif bold letters and digits look bold anywhere text is shown, which is how a bold footer is done.
 * Only A to Z, a to z and 0 to 9 change; everything else (spaces, punctuation, accents, emoji, {variables}) is left alone.
 * Not for long text: screen readers and search treat these as symbols, not words.
 */

const UPPER = 0x1d5d4; // 𝗔
const LOWER = 0x1d5ee; // 𝗮
const DIGIT = 0x1d7ec; // 𝟬

/** Keeps `{variables}` such as {server} or {user} readable: they are replaced when the message is sent and must stay ordinary letters. */
const VARIABLE = /\{[^{}]*\}/g;

function map(text: string, convert: (char: string) => string): string {
  const parts: string[] = [];
  let last = 0;
  for (const match of text.matchAll(VARIABLE)) {
    parts.push([...text.slice(last, match.index)].map(convert).join(""), match[0]);
    last = (match.index ?? 0) + match[0].length;
  }
  parts.push([...text.slice(last)].map(convert).join(""));
  return parts.join("");
}

export function toBold(text: string): string {
  return map(text, (char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90) return String.fromCodePoint(UPPER + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(LOWER + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(DIGIT + code - 48);
    return char;
  });
}

export function toPlain(text: string): string {
  return [...text]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code >= UPPER && code < UPPER + 26) return String.fromCharCode(65 + code - UPPER);
      if (code >= LOWER && code < LOWER + 26) return String.fromCharCode(97 + code - LOWER);
      if (code >= DIGIT && code < DIGIT + 10) return String.fromCharCode(48 + code - DIGIT);
      return char;
    })
    .join("");
}

export function hasBold(text: string): boolean {
  return toPlain(text) !== text;
}
