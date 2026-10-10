/**
 * What the welcome editor's preview shows for a message: the variables filled in for an example member. This mirrors
 * the bot's WelcomeTemplate, so the preview and the real message agree on what `{user}`, `{server}` and the rest become.
 * It can't know whether a role or channel typed as `{&Admin}` or `{#verify}` really exists, so it always draws them as
 * mentions; the real message does the same when the name is found, and shows plain text when it isn't.
 */

/** The variables, for the editor's list. Keep in step with WelcomeTemplate.VARIABLES in the bot. */
export const WELCOME_VARIABLES: { token: string; meaning: string }[] = [
  { token: "{user}", meaning: "The new member, as a mention" },
  { token: "{username}", meaning: "The new member's name" },
  { token: "{avatar}", meaning: "The new member's avatar address (use it as an image or thumbnail)" },
  { token: "{server}", meaning: "The server's name" },
  { token: "{channel}", meaning: "The welcome channel's name" },
  { token: "{count}", meaning: "How many members the server has" },
  { token: "{@name}", meaning: "Mention a member by name" },
  { token: "{&role}", meaning: "Mention a role by name" },
  { token: "{#channel}", meaning: "Link a channel by name" },
  { token: "{everyone}", meaning: "Shows @everyone without pinging" },
  { token: "{here}", meaning: "Shows @here without pinging" },
];

export interface PreviewSample {
  username: string;
  server: string;
  channel: string;
  count: number;
  avatarUrl: string;
}

export interface Filled {
  text: string;
  /** Placeholder mention tokens in `text`, and the label to draw for each. */
  mentions: Record<string, string>;
}

const TOKEN = /\{([^{}\n]{1,100})}/g;
const RAW_MENTION = /<(@&|@|#)\d+>/g;

/**
 * Fills the variables in `template`. With `plain`, a mention becomes a plain name, as it does in a title, author or footer
 * where Discord would otherwise show a raw id.
 */
export function fillPreview(template: string, sample: PreviewSample, plain = false): Filled {
  const mentions: Record<string, string> = {};
  let next = 0;
  const mention = (label: string) => {
    const token = `<@${900_000_000 + next++}>`;
    mentions[token] = label;
    return token;
  };

  const text = template.replace(TOKEN, (whole: string, inner: string) => {
    switch (inner) {
      case "user":
        return plain ? sample.username : mention(`@${sample.username}`);
      case "username":
        return sample.username;
      case "avatar":
        return sample.avatarUrl;
      case "server":
        return sample.server;
      case "channel":
        return sample.channel;
      case "count":
        return String(sample.count);
      case "everyone":
        return "@everyone";
      case "here":
        return "@here";
    }
    const name = inner.slice(1).trim();
    if (name && (inner[0] === "@" || inner[0] === "&" || inner[0] === "#")) {
      const label = inner[0] === "#" ? `#${name}` : `@${name}`;
      return plain ? label : mention(label);
    }
    return whole;
  });

  // mentions typed by hand, as <#123> or <@&456>, get a generic label
  for (const m of text.matchAll(RAW_MENTION)) {
    if (!mentions[m[0]]) mentions[m[0]] = m[1] === "#" ? "#channel" : m[1] === "@&" ? "@role" : "@member";
  }
  return { text, mentions };
}

/** A colour number as the `#rrggbb` an `<input type="color">` wants. */
export function colorToHex(color: number | null): string {
  return `#${(color ?? 0x5865f2).toString(16).padStart(6, "0")}`;
}

export function hexToColor(hex: string): number | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? parseInt(m[1], 16) : null;
}
