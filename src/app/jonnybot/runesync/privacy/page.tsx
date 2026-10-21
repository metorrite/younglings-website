import { gateJonnyBot } from "@/components/jonnybot/gate";
import type { Metadata } from "next";
import { Page, Section } from "@/components/jonnybot/Prose";

export const metadata: Metadata = { title: "RuneSync privacy", description: "What the RuneSync plugin sends to JonnyBot, where it goes, how long it is kept and how to remove it." };

/**
 * RuneSync's privacy notice (RUNESYNC-DESIGN.md section 12, ticket T-205), linked from the mod.io listing. It must say exactly what the
 * plugin and the bot do: change it together with them (categories in PluginCategory, retention in PluginRetention, diagnostics in
 * RuneSyncService, hosting in the design's D7). It covers what Jagex's Case 2/3 rules ask of a privacy notice (who is responsible and how to
 * reach them, purposes, legal basis, kinds of data, recipients, transfers, retention, rights). The contact address and the responsible
 * person's name come from RUNESYNC_CONTACT_EMAIL and RUNESYNC_CONTROLLER_NAME; until they are set a clear placeholder shows.
 */
export default async function RuneSyncPrivacyPage() {
  const gated = await gateJonnyBot();
  if (gated) return gated;
  const contact = process.env.RUNESYNC_CONTACT_EMAIL?.trim();
  const controller = process.env.RUNESYNC_CONTROLLER_NAME?.trim();
  return (
    <Page title="RuneSync privacy notice" intro="RuneSync is a free RuneScape 3 plugin. This is what it sends, where it goes, and how to remove it. Last updated October 2026.">
      <Section title="What RuneSync is">
        <p>
          RuneSync sends some of <strong>your own</strong> RuneScape activity to JonnyBot, a Discord bot your clan uses, so your clan&apos;s events and points can count it
          automatically. It needs the RS Link plugin, which links your character to your Discord account.
        </p>
      </Section>

      <Section title="What is sent, only if you switch it on">
        <p>Every kind starts switched off. You choose on your JonnyBot profile (Plugin tab) or in RuneSync&apos;s settings panel in the game.</p>
        <ul>
          <li>
            <strong>Skill XP:</strong> your XP total and level in each skill.
          </li>
          <li>
            <strong>Drops:</strong> items you receive from monsters you kill (item, quantity) and the monster they came from. JonnyBot adds a price from the Grand Exchange
            guide.
          </li>
          <li>
            <strong>Boss kills:</strong> the boss name and your kill count, read from your own game message &ldquo;Your &hellip; kill count is&rdquo;.
          </li>
          <li>
            <strong>Achievements:</strong> your clue scroll completions (tier and count), read from your own game message.
          </li>
        </ul>
        <p>
          With each upload: your RuneScape name, RuneSync&apos;s version, and a signed proof from RS Link that this name is linked to your Discord account. Each report has an
          id; if you allowed the optional tracking permission, that id includes a short code made from the game&apos;s tracking number for your character (it can&apos;t be turned
          back into the number, and the number itself is never sent). When RuneSync checks your settings it also says its version and whether you paused it, so your
          profile can show that.
        </p>
        <p>
          Kill counts and clues need the optional chat permission. RuneSync only reads your own game messages, never clan, friends or public chat, and only the boss
          name, kill count, clue tier and count leave the game. Chat text is never sent.
        </p>
      </Section>

      <Section title="What is not sent">
        <p>Passwords, chat text, other players (nothing about anyone else is ever sent), your location, your bank or inventory.</p>
      </Section>

      <Section title="Bug reports">
        <p>
          If you press &ldquo;Get diagnostics id&rdquo; in RuneSync&apos;s panel, it sends a snapshot of the plugin&apos;s own state: its version, your switches, whether it is paused,
          how many reports are waiting, the results of the last 20 uploads and which permissions are granted. No proof of your link, no name, no chat and none of what
          you reported. You get a short id to put in a bug report. Snapshots are deleted after 14 days.
        </p>
      </Section>

      <Section title="Why, and on what basis">
        <p>
          RuneSync&apos;s reports are used for your clan&apos;s events (bingo tiles, boss nights, competitions), its points, and your own JonnyBot profile. The legal basis is your
          consent: each kind is off until you switch it on, and you can switch it off again at any time. Switching off stops new reports; what was already sent stays until
          you delete it or it expires.
        </p>
      </Section>

      <Section title="Where it goes">
        <p>
          To JonnyBot&apos;s servers, hosted by Railway in the United States (US West). The United States is not a UK-adequate country. Your data is protected by encrypted
          connections (HTTPS), access limited to the person who runs JonnyBot, and automatic deletion. Railway stores it for JonnyBot as its hosting provider. It is
          not sold or shared with anyone else.
        </p>
      </Section>

      <Section title="Who sees it">
        <ul>
          <li>You see everything RuneSync sent about you on your JonnyBot profile (Plugin tab).</li>
          <li>Your clan sees what its events and points use: progress on event tiles, kills counted in a boss night, points awarded.</li>
          <li>The person who runs JonnyBot can open a bug-report snapshot when you share its id.</li>
        </ul>
      </Section>

      <Section title="How long it is kept">
        <ul>
          <li>Raw reports are deleted after 180 days.</li>
          <li>Points and event results that came from them stay with your clan&apos;s event history.</li>
          <li>Bug-report snapshots are deleted after 14 days.</li>
        </ul>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>See and delete everything RuneSync sent on your JonnyBot profile (Plugin tab, &ldquo;Delete everything the plugin sent&rdquo;).</li>
          <li>Switch any kind off at any time, on the website or in the game. Pause sending in the game for one character.</li>
          <li>Remove the plugin. Nothing is sent while it is not running.</li>
        </ul>
        <p>
          You can also ask for a copy of your data, or for it to be corrected or deleted, at the address below. If you are unhappy with how it is handled, you can complain
          to the UK Information Commissioner&apos;s Office (ico.org.uk).
        </p>
        <p>
          Who is responsible: {controller ? <strong>{controller}</strong> : <strong>[name of the person who runs JonnyBot, to be added before release]</strong>}, who runs
          JonnyBot.
        </p>
        <p>
          Contact:{" "}
          {contact ? (
            <a href={`mailto:${contact}`} className="text-gold underline-offset-2 hover:underline">
              {contact}
            </a>
          ) : (
            <strong>[contact email to be added before release]</strong>
          )}
        </p>
      </Section>
    </Page>
  );
}
