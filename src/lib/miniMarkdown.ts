/**
 * The small Markdown a clan may write in its website's text blocks (docs/DOMAINS-AND-SITE-BUILDER.md B2): headings (#, ##, ###), paragraphs,
 * bulleted (-, *) and numbered (1.) lists, **bold**, *italic*, and [links](https://...). No HTML, no images, no code: anything else is shown
 * as the text it is. The result is a tree the page renders as React elements, so nothing a clan types is ever inserted as HTML.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; children: Inline[] }
  | { type: "italic"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] };

export const MAX_MARKDOWN = 5000;

/** An http(s) link, or null (javascript:, data:, relative and malformed addresses are not links). */
export function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseInline(text: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let plain = "";
  const flush = () => {
    if (plain) out.push({ type: "text", text: plain });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    if (depth < 3 && text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ type: "bold", children: parseInline(text.slice(i + 2, end), depth + 1) });
        i = end + 2;
        continue;
      }
    }
    if (depth < 3 && (text[i] === "*" || text[i] === "_") && text[i + 1] !== text[i]) {
      const end = text.indexOf(text[i], i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: "italic", children: parseInline(text.slice(i + 1, end), depth + 1) });
        i = end + 1;
        continue;
      }
    }
    if (depth < 3 && text[i] === "[") {
      const close = text.indexOf("](", i + 1);
      const end = close < 0 ? -1 : text.indexOf(")", close + 2);
      const href = end < 0 ? null : safeHref(text.slice(close + 2, end));
      if (href && close > i + 1) {
        flush();
        out.push({ type: "link", href, children: parseInline(text.slice(i + 1, close), depth + 1) });
        i = end + 1;
        continue;
      }
    }
    plain += text[i];
    i++;
  }
  flush();
  return out;
}

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.slice(0, MAX_MARKDOWN).replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;
  const endParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  const endList = () => {
    if (list) blocks.push({ type: "list", ...list });
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      endParagraph();
      endList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      endParagraph();
      endList();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, children: parseInline(heading[2]) });
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d{1,3}[.)]\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      endParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) endList();
      list ??= { ordered, items: [] };
      list.items.push(parseInline((bullet ?? numbered)![1]));
      continue;
    }
    endList();
    paragraph.push(line);
  }
  endParagraph();
  endList();
  return blocks;
}
