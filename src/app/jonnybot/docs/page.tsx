import { gateJonnyBot } from "@/components/jonnybot/gate";
import type { Metadata } from "next";
import { Page, Section } from "@/components/jonnybot/Prose";
import { jonnybotHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "Docs", description: "How to set up and use JonnyBot." };

const COMMANDS: { name: string; who: string; what: string }[] = [
  { name: "/rs", who: "Everyone", what: "Link your RuneScape 3 name, see your profile and stats, update your data, and manage your linked accounts." },
  { name: "/rsadmin", who: "Admins and Support", what: "Admin panel: review link requests, look up a player, refresh the clan, bulk actions." },
  { name: "/configure", who: "Administrators", what: "Quick server settings in Discord: clan name, admin roles and the review channel. The dashboard does all of this and more." },
  { name: "/poll", who: "Linked clan members (changeable)", what: "Create a poll, or end one you started." },
  { name: "/signup", who: "Admins (changeable)", what: "Create signups: queues, groups and submission forms, with a public panel for members." },
  { name: "/wrapped", who: "Everyone (changeable)", what: "A recap card for a week, month, year or all time: XP, Citadel, boss kills and more." },
  { name: "/ca", who: "Everyone (changeable)", what: "Look up a Combat Mastery achievement: its tier, scores and the wiki's tips." },
  { name: "/remindme", who: "Everyone (changeable)", what: "Set a personal reminder (10m, 2h30m, 1d), list yours, or cancel one. It arrives by DM." },
  { name: "/afk", who: "Everyone (changeable)", what: "Mark yourself away: people who mention you are told, and it clears the next time you speak." },
  { name: "/split", who: "Everyone (changeable)", what: "Split a drop between a group (1.5b, 250m, 12,500k), with an optional fee off the top and any left-over coins shown." },
  { name: "/suggest", who: "Everyone (changeable)", what: "Post an idea in the suggestions channel for everyone to vote on with the up and down buttons." },
  { name: "/warn", who: "Admins (changeable)", what: "Warn a member and keep a record: add, list and remove. The member is told by DM when their DMs are open." },
  { name: "/announce", who: "Admins (changeable)", what: "Post an announcement in a channel, optionally pinging one role, @everyone or @here. @everyone and @here only work for people who may mention everyone there. The dashboard's Announcements page does the same." },
  { name: "/events", who: "Everyone (changeable)", what: "Your events (place, points, buy-in, prizes), the ones open for signup, and join or leave. Events themselves are made and run from the dashboard." },
  { name: "/price", who: "Everyone (changeable)", what: "A RuneScape 3 item's Grand Exchange price with its 7 and 30 day change and a link to the wiki. Pick the item from the suggestions." },
  { name: "/worldevents", who: "Everyone (changeable)", what: "The Voice of Seren right now and the events that come round by themselves with how often, from the RuneScape Wiki. Hourly Voice of Seren reminders can be switched on from the RuneScape timers page." },
];

const DASHBOARD: [string, string][] = [
  ["Overview", "Is the bot healthy, how many members are linked, open tickets, signups and polls, and what is set up. A checkup card tells you if anything needs fixing, and any notice about a known issue shows at the top."],
  ["Server setup", "The basics: your clan, where link requests are reviewed and the roles members get. Each section opens and closes, and a bar at the bottom saves everything and warns you about unsaved changes."],
  ["Roles & permissions", "Who counts as Admin, Support and Developer, and your own groups of roles. Commands can be limited to these groups."],
  ["Guided setup", "A step-by-step run through the parts of JonnyBot: Quick, Full or Custom. It starts from what is already set, so you can leave and pick it up later."],
  ["Commands", "Turn each command on or off, choose who may use it and in which channels. Search and filter the list."],
  ["Activity announcements", "Where drops, level-ups, quests, boss kills, Citadel visits, joins and leaves are announced."],
  ["Welcome message", "Design the message new members get: an embed or a container, with a preview and a Send test button."],
  ["Goodbye message", "A line posted when someone leaves, with clickable variables and a preview."],
  ["Autoroles", "Roles given to everyone who joins (and a separate list for bots), straight away or after a delay of up to 7 days."],
  ["Role panels", "A message of buttons members press to take or drop a role. Choose any number, or only one at a time, and see a live preview."],
  ["Starboard", "Messages that collect enough of a reaction (a star by default) are reposted in a channel you choose."],
  ["Automatic replies", "Reply to a word or phrase in your server's messages with text you write, with a cooldown so it can't spam."],
  ["Giveaways", "Start a giveaway with an Enter button and a timed draw. See who entered, end one early, draw again, or delete it."],
  ["Suggestions", "Members post ideas with /suggest and everyone votes. Reply here: approve, deny or mark them implemented."],
  ["Auto-clean", "Channels that delete their own old messages after an age you choose, keeping pinned messages. Check it on a test channel first."],
  ["Moderation log", "A channel where bans, unbans and timeouts are recorded, with who did it and why when JonnyBot can read the audit log."],
  ["New accounts", "Be told when a Discord account younger than a number of days joins, or keep them out until they are old enough. Off by default."],
  ["Auto-delete", "Keep a channel free of Discord invites, links or files: a matching message is deleted at once and the person is told why. Moderators are never affected."],
  ["Event manager", "Run bingos, scavenger hunts, XP competitions, boss nights or your own custom events: objectives, teams and players, proof to approve, standings, buy-ins, prizes and payouts. Start one with the standard options in a click, a few quick questions, or a guided setup of every option that keeps a draft as you go; save an event's setup as a template to make similar ones fast. For team events, a team builder lets you drag players onto teams with star ratings drawn from their linked RuneScape accounts, see how level the teams are, and call them final (or use /events team in Discord). Once signups are closed and the roster is confirmed, an event can have its own Discord roles and channels made for it: a role for the players and the organisers (and each team), and a category with private channels only the right people can see, kept in step as players join, leave or change team. Each event can post its own signup, and members see their own place and prizes on their profile."],
  ["Points", "Switch on a points ledger for your server, name the points, give or take them with a reason, and see the leaderboard and full history."],
  ["Automod", "Deletes invites, links, blocked words, shouting, spam and emoji floods automatically, and can give the writer a warning that counts toward Autopunish."],
  ["Warnings", "The record of warnings given with /warn. Search by member and take one back."],
  ["Polls & signups", "Where member polls are posted, and what members can start themselves."],
  ["Tickets", "Panels, the tickets themselves with their saved transcripts, settings, and panel defaults."],
  ["Post a message and Scheduled posts", "Write a message and have JonnyBot post it now or later, with headings, dividers, colours, images and buttons."],
  ["Clan profile", "How your clan appears to others: name, tagline, focus, recruiting status and where to apply. Unlisted by default (nothing shows until you pick an address); a public listing needs a clan Owner or Deputy Owner to verify the clan, and only clan-level facts are ever shown, never members."],
  ["Public events", "Choose which of your Discord events are shown in the public clan directory. Nothing is shared until your clan profile is public or unlisted."],
  ["Alliances", "Team up with other clans: invite a clan by its directory address, and share events with your allies only, without making them public."],
  ["Clan plugin", "How many of your members use the in-game clan plugin, as counts only. Nobody is named and nobody has to install anything."],
  ["Roster", "For a clan server: every member, who is verified, how fresh their data is, with staff-only notes."],
  ["Checkup", "Finds channels JonnyBot can't post in and roles it can't give out, and tells you how to fix each one."],
  ["Activity log", "Every change made from the dashboard, by whom and when."],
];

export default async function DocsPage() {
  const gated = await gateJonnyBot();
  if (gated) return gated;
  const site = await currentSite();
  const contents = [
    ["start", "Getting started"],
    ["access", "Who can use the dashboard"],
    ["dashboard", "The dashboard"],
    ["commands", "Commands"],
    ["linking", "Linking RuneScape names"],
    ["welcome", "Welcome messages"],
    ["more", "Tickets, polls and signups"],
  ];

  return (
    <Page title="Docs" intro="Everything you need to set JonnyBot up and use it day to day." wide>
      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-6 space-y-2 text-sm">
            {contents.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted transition hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-12">
          <Section id="start" title="Getting started">
            <ol>
              <li>
                <a href={jonnybotHref(site, "/install")}>Add JonnyBot</a> to your server (you need Manage Server there).
              </li>
              <li>
                Open the <a href={jonnybotHref(site, "/dashboard")}>Bot Dashboard</a>, sign in with Discord and pick your server.
              </li>
              <li>
                Start the <strong>Setup guide</strong> from Settings. <strong>Quick</strong> asks a few yes or no questions and just the details each part needs.{" "}
                <strong>Full</strong> goes through every option. <strong>Custom</strong> lets you tick the parts first.
              </li>
              <li>Start with the admin roles: nothing is set up for you, so you choose what the bot does and for whom.</li>
            </ol>
            <p>The guide starts from what is already set, so you can leave and pick it up later or run it again to change one part.</p>
          </Section>

          <Section id="access" title="Who can use the dashboard">
            <ul>
              <li>The server owner, anyone with the <strong>Administrator</strong> or <strong>Manage Server</strong> permission, and anyone with a role in the server&apos;s <strong>Admin</strong> group.</li>
              <li>People in the <strong>Developer</strong> group can open it with a limited view.</li>
              <li>It is checked against your server&apos;s roles on every click, so removing someone&apos;s role removes their access immediately.</li>
            </ul>
          </Section>

          <Section id="dashboard" title="The dashboard">
            <ul>
              {DASHBOARD.map(([name, text]) => (
                <li key={name}>
                  <strong>{name}.</strong> {text}
                </li>
              ))}
            </ul>
            <p>
              Tip: press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere in the dashboard to jump to a page by typing part of its name. Next to many settings is a small <strong>i</strong>: hover or tap it for a plain explanation of what the setting does.
            </p>
          </Section>

          <Section id="commands" title="Commands">
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="p-3">Command</th>
                    <th className="p-3">Who</th>
                    <th className="p-3">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMANDS.map((c) => (
                    <tr key={c.name} className="border-t border-surface-border align-top">
                      <td className="p-3 font-mono text-gold">{c.name}</td>
                      <td className="p-3 text-muted">{c.who}</td>
                      <td className="p-3">{c.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Each command on the dashboard&apos;s Commands page can be turned off, limited to certain groups or roles, and limited to certain channels. Admins can always use a command anywhere.
            </p>
          </Section>

          <Section id="linking" title="Linking RuneScape names">
            <p>
              A member runs <code>/rs</code> and enters their RuneScape 3 name. Staff approve the request (or it is checked automatically where that is switched on), and from then on their profile, stats and recaps appear, and their roles follow the clan roster:
              <strong> Member</strong> while they are in the clan, <strong>Guest</strong> when they aren&apos;t.
            </p>
            <ul>
              <li>A name is owned by one Discord account. If someone else has it, the request is refused.</li>
              <li>A member who unlinks removes their name everywhere. An admin who removes a link does so for their own server only.</li>
              <li>Tracking needs a public Adventurer&apos;s Log. A private profile can be linked but not tracked.</li>
            </ul>
          </Section>

          <Section id="welcome" title="Welcome messages">
            <p>
              The welcome is designed on the dashboard&apos;s Welcome page, with a live preview and a <strong>Send test</strong> button that works while the welcome is switched off. A test needs a channel chosen first.
            </p>
            <ul>
              <li>
                <strong>Embed</strong> is the classic boxed message. A button can only sit underneath it, and the footer is always small and grey: Discord fixes both.
              </li>
              <li>
                <strong>Container</strong> is the newer layout. The footer is ordinary text, so it can be bright or bold, links work in every part, and the link button can sit inside the message. The editor switches to it for you when you ask for one of those.
              </li>
              <li>
                Variables fill in for each new member: <code>{"{user}"}</code>, <code>{"{username}"}</code>, <code>{"{avatar}"}</code>, <code>{"{server}"}</code>, <code>{"{count}"}</code> and more, listed under the editor. In a container, <code>{"{rs_button}"}</code> places the link button on the line where you write it.
              </li>
              <li>
                Links are written <code>{"[text](https://example.com)"}</code>. Pictures can be uploaded instead of pasted, and are shrunk to fit.
              </li>
            </ul>
          </Section>

          <Section id="more" title="Tickets, polls and signups">
            <ul>
              <li>
                <strong>Tickets.</strong> Panels with your own questions, staff roles to ping and escalate to, and transcripts. For now they are set up with <code>/configure</code> in Discord; the dashboard shows what is open.
              </li>
              <li>
                <strong>Polls.</strong> Anyone allowed can make a poll with <code>/poll</code>, and end the ones they started.
              </li>
              <li>
                <strong>Signups.</strong> <code>/signup</code> makes queues, groups and submission forms, with a public panel members use and admin controls for you. The dashboard&apos;s Commands page can fix the admin channel and limit where public panels go.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </Page>
  );
}
