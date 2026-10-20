import type { FooterStyle, LinkButtonStyle, WelcomeField, WelcomeMessageType } from "@/lib/jonnybot-admin";

/**
 * The message a server composes with the shared MessageEditor: text, a classic embed, a container, or text above an embed. It is the
 * message part of the Welcome config (same field names, same saved shape), so a feature that posts a templated message (welcome, ban
 * announcement, later the autoresponder, reminders and the embedder) saves exactly these fields next to its own.
 */
export interface MessageDraft {
  messageType: WelcomeMessageType;
  content: string;
  /** 0xRRGGBB, or null for no colour bar. */
  color: number | null;
  title: string;
  titleUrl: string;
  description: string;
  authorName: string;
  authorIconUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
  footerIconUrl: string;
  fields: WelcomeField[];
  linkButton: boolean;
  linkButtonLabel: string;
  linkButtonStyle: LinkButtonStyle;
  footerStyle: FooterStyle;
}

/** Discord's limits as the bot enforces them (WelcomeValidator), so the counters turn red before a save would be refused. */
export const MESSAGE_LIMITS = { content: 1800, title: 256, description: 3900, author: 256, footer: 2048, fieldName: 256, fieldValue: 1024, fields: 25, total: 6000 };

export type MessageLimits = typeof MESSAGE_LIMITS;

/** The characters Discord counts across a whole embed (title, description, author, footer, every field), which may not pass 6000. */
export function embedTotal(d: Pick<MessageDraft, "title" | "description" | "authorName" | "footerText" | "fields">): number {
  return d.title.length + d.description.length + d.authorName.length + d.footerText.length + d.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
}

/** A message with nothing in it, for features that keep only some of the fields (the goodbye message keeps just the text). */
export const EMPTY_MESSAGE: MessageDraft = {
  messageType: "MESSAGE",
  content: "",
  color: null,
  title: "",
  titleUrl: "",
  description: "",
  authorName: "",
  authorIconUrl: "",
  thumbnailUrl: "",
  imageUrl: "",
  footerText: "",
  footerIconUrl: "",
  fields: [],
  linkButton: false,
  linkButtonLabel: "",
  linkButtonStyle: "primary",
  footerStyle: "small",
};
