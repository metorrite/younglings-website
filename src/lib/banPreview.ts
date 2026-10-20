import { fillPreview, type Filled, type PreviewSample } from "@/lib/welcomePreview";

/**
 * The preview of a message about someone who was banned (or left): the bot fills it like the goodbye message, so {user} is the name in
 * bold and nothing is a mention, because the person is no longer in the server. Keep in step with GoodbyeService.lookup in the bot.
 */
export function fillBanned(template: string, sample: PreviewSample, plain = false): Filled {
  const filled = fillPreview(template.replaceAll("{user}", plain ? sample.username : `**${sample.username}**`), sample, true);
  return { text: filled.text, mentions: {} };
}
