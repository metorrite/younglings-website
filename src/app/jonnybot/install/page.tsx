import type { Metadata } from "next";
import { Page, Section } from "@/components/jonnybot/Prose";
import { installUrl } from "@/lib/dashboard";
import { jonnybotHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Install", description: "Add JonnyBot to your Discord server and set it up." };

const PERMISSIONS: [string, string][] = [
  ["Manage Roles", "Gives and removes the Member and Guest roles, verification roles and any self-assigned roles you set up."],
  ["Manage Channels, Manage Threads, Create Threads", "Creates ticket channels and threads, and keeps them tidy."],
  ["View Channels, Send Messages, Embed Links, Attach Files, Read Message History", "Posts the clan feed, welcome messages and ticket transcripts, and reads ticket replies."],
  ["Mention @everyone, @here and All Roles", "Only for pings you set up yourself, such as a ticket's staff role."],
  ["Add Reactions, Use External Emojis, Manage Messages", "Reactions on posts, JonnyBot's own emojis, and cleaning up its own messages."],
  ["View Audit Log", "Lets the audit-log relay show who changed what, if you switch it on."],
];

export default async function InstallPage() {
  const site = await currentSite();
  const install = installUrl();

  return (
    <Page title="Install JonnyBot" intro="Adding it takes a minute. It starts with nothing switched on, so you choose what it does in your server.">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-surface-border bg-surface p-6">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Add JonnyBot to a server</p>
          <p className="text-sm text-muted">You need the Manage Server permission in the server. Discord asks which one.</p>
        </div>
        {install ? (
          <a href={install} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]">
            Add to Discord
          </a>
        ) : (
          <span className="text-sm text-muted">The install link isn&apos;t set up on this site yet.</span>
        )}
      </div>

      <Section title="After it joins">
        <ol>
          <li>
            Open the <a href={jonnybotHref(site, "/dashboard")}>Bot Dashboard</a> and sign in with Discord. Your server is listed once JonnyBot is in it and you have access.
          </li>
          <li>
            Run the <strong>Setup guide</strong> from the server&apos;s Settings page: <strong>Quick</strong> (about three minutes, a few yes or no questions), <strong>Full</strong> (every option) or <strong>Custom</strong> (pick the parts).
          </li>
          <li>Set who the admins are first. Nothing is set up for you, so until you do, only the server owner and people with Administrator or Manage Server can open the dashboard.</li>
          <li>
            Move JonnyBot&apos;s role above any role it should hand out, in Server Settings, then Roles. Discord only lets a bot manage roles below its own.
          </li>
        </ol>
      </Section>

      <Section title="Why it asks for these permissions">
        <p>Everything it asks for is used by a feature you can switch on. If you never use tickets or verification, those permissions simply sit unused.</p>
        <ul>
          {PERMISSIONS.map(([name, why]) => (
            <li key={name}>
              <strong>{name}.</strong> {why}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Good to know">
        <ul>
          <li>JonnyBot is for RuneScape 3. It doesn&apos;t cover Old School RuneScape.</li>
          <li>Tracking works from a player&apos;s public Adventurer&apos;s Log. A player with a private profile can be linked but not tracked.</li>
          <li>
            The <a href={jonnybotHref(site, "/docs")}>docs</a> cover each feature, and the <a href={jonnybotHref(site, "/faq")}>FAQ</a> answers the common questions.
          </li>
        </ul>
      </Section>
    </Page>
  );
}
