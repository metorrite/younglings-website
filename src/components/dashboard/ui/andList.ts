/** "a", "a and b", "a, b and c": a list of things in a sentence, for the line a page shows about what its Advanced view adds. */
export function andList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
