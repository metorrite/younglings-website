import type { WelcomeDraft } from "@/lib/jonnybot-admin";

/**
 * The blocks a Container welcome is made of, worked out the same way the bot does it (ContainerWelcome in the bot) so the preview shows
 * the same layout: author, title and description first (the thumbnail beside the first block), then the fields stacked, the image, and
 * the footer as small grey text; the link button goes on the line with {rs_button}, or at the bottom. Keep in step with the bot.
 *
 * Text here still holds `{variables}`: the preview fills each block as it draws it.
 */

export const BUTTON_MARKER = "{rs_button}";
const BLANK = "⠀";

export type ContainerBlock =
  | { kind: "text"; text: string }
  /** The first block, with the thumbnail beside it. */
  | { kind: "thumb"; text: string; thumbnail: string }
  /** A line of text with the link button beside it. */
  | { kind: "button"; text: string }
  | { kind: "gallery"; url: string }
  | { kind: "gap" }
  /** The button on its own row at the bottom. */
  | { kind: "row" };

interface Pieces {
  before: string;
  line: string;
  after: string;
  hasButton: boolean;
}

export function splitAtButton(text: string): Pieces {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => l.includes(BUTTON_MARKER));
  if (at < 0) return { before: text.trim(), line: "", after: "", hasButton: false };
  return {
    before: lines.slice(0, at).join("\n").trim(),
    line: lines[at].split(BUTTON_MARKER).join("").trim(),
    after: lines.slice(at + 1).join("\n").split(BUTTON_MARKER).join("").trim(),
    hasButton: true,
  };
}

function styled(text: string, prefix: string): string {
  if (!prefix) return text;
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((l) => prefix + l.trim())
    .join("\n");
}

export function containerBlocks(draft: WelcomeDraft, plain: (template: string) => string, isWebAddress: (url: string) => boolean): ContainerBlock[] {
  const out: ContainerBlock[] = [];
  let placed = false;
  const wantButton = () => draft.linkButton && !placed;

  /** Adds `text` as blocks; where it holds the marker (and the button is wanted and not yet placed) that line gets the button beside it. */
  function blocks(text: string, withButton: boolean, thumbnail: string | null, prefix: string) {
    if (!text.trim()) return;
    const pieces = withButton ? splitAtButton(text) : { before: text.split(BUTTON_MARKER).join("").trim(), line: "", after: "", hasButton: false };
    let thumbnailUsed = thumbnail === null;
    const addText = (t: string, thumb: string | null) => {
      if (!t.trim()) return;
      if (thumb !== null && !thumbnailUsed) {
        out.push({ kind: "thumb", text: t, thumbnail: thumb });
        thumbnailUsed = true;
      } else out.push({ kind: "text", text: t });
    };

    if (!pieces.hasButton) {
      addText(styled(pieces.before, prefix), thumbnail);
      return;
    }
    placed = true;
    if (pieces.before.trim()) addText(styled(pieces.before, prefix), thumbnail);
    out.push({ kind: "button", text: pieces.line ? styled(pieces.line, prefix) : BLANK });
    if (pieces.after.trim()) addText(styled(pieces.after, prefix), null);
    if (!thumbnailUsed && thumbnail !== null) addText(BLANK, thumbnail);
  }

  // header
  const author = draft.authorName.trim();
  const title = draft.title.trim();
  const titleUrl = plain(draft.titleUrl);
  let header = "";
  if (author) header += `-# ${author}\n`;
  if (title) header += `## ${isWebAddress(titleUrl) ? `[${title}](${titleUrl})` : title}\n`;
  header += draft.description.trim();
  const thumbnail = plain(draft.thumbnailUrl);
  blocks(header.trim(), wantButton(), isWebAddress(thumbnail) ? thumbnail : null, "");

  // fields, stacked; neighbours with no button between them share one block
  let fields = "";
  for (const f of draft.fields) {
    const name = f.name.trim();
    const value = f.value.trim();
    if (!name || !value) continue;
    const block = `**${name}**\n${value}`;
    if (block.includes(BUTTON_MARKER) && wantButton()) {
      blocks(fields.trim(), false, null, "");
      fields = "";
      blocks(block, true, null, "");
    } else {
      if (fields) fields += "\n\n";
      fields += block.split(BUTTON_MARKER).join("");
    }
  }
  blocks(fields.trim(), false, null, "");

  // image
  const image = plain(draft.imageUrl);
  if (isWebAddress(image)) out.push({ kind: "gallery", url: image });

  // footer
  const footer = draft.footerText.trim();
  if (footer) {
    if (out.length > 0) out.push({ kind: "gap" });
    blocks(footer, wantButton(), null, "-# ");
  }

  if (draft.linkButton && !placed) out.push({ kind: "row" });
  return out;
}
