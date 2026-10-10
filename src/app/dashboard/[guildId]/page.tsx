import Link from "next/link";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi, dashboardApi } from "@/lib/jonnybot-admin";
import { setupChecklist } from "@/lib/setupChecklist";

/** What is still only set up in Discord with /configure, or not yet possible for this server. Each moves onto the dashboard as it is built. */
const NOT_YET = [
  { name: "Tickets", note: "Ticket panels and their wording." },
  { name: "Polls and signups", note: "Where member-created polls are posted." },
];

export default async function GuildOverview({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const [welcome, setup, permissions, tracking] = await Promise.all([
    dashboardApi.welcome(guild).then(dashboardData),
    adminApi.serverSetup(guild).then(dashboardData),
    adminApi.permissions(guild).then(dashboardData),
    adminApi.tracking(guild).then(dashboardData),
  ]);
  const checklist = setupChecklist({ setup, permissions, tracking: tracking.groups, welcome });
  const doneCount = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-surface-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-gold">Setup guide</h2>
            <p className="mt-1 text-sm text-muted">
              {doneCount === checklist.length ? "Everything in the guide is set up." : `${doneCount} of ${checklist.length} parts set up.`} A short run of questions gets JonnyBot working here.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span aria-hidden="true" className={item.done ? "text-emerald-300" : "text-muted"}>{item.done ? "✓" : "○"}</span>
                  <span className={item.done ? "text-muted" : ""}>
                    {item.label}
                    {!item.done && <span className="text-xs text-muted"> — {item.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Link href={`/dashboard/${guildId}/wizard`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
            {doneCount === 0 ? "Start the setup guide" : doneCount === checklist.length ? "Run it again" : "Continue the setup guide"}
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-surface-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gold">Server setup</h2>
            <p className="mt-1 text-sm text-muted">
              {setup.clanActive
                ? `Tracking the clan ${setup.clanName}.`
                : setup.clanName
                  ? `${setup.clanName} is saved but clan features are switched off.`
                  : "No clan set yet. Start here: a new server begins empty."}{" "}
              {setup.verificationReviewChannelId ? "Link requests have a review channel." : "No review channel for link requests yet."}
            </p>
          </div>
          <Link href={`/dashboard/${guildId}/setup`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
            {setup.clanName ? "Edit" : "Set up"}
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-surface-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gold">Welcome message</h2>
            <p className="mt-1 text-sm text-muted">
              Greets each new member in a channel{welcome.alsoDm ? " and by DM" : ""}.{" "}
              {welcome.enabled ? (welcome.channelName ? `Posting in #${welcome.channelName}.` : "Switched on, but no channel is set.") : "Switched off."}
            </p>
          </div>
          <Link href={`/dashboard/${guildId}/welcome`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110">
            {welcome.enabled ? "Edit" : "Set up"}
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-surface-border bg-surface p-6">
        <h2 className="font-semibold text-gold">Not on the dashboard yet</h2>
        <p className="mt-1 text-sm text-muted">These are still being moved across. Until then JonnyBot does nothing for them in this server unless you set them up in Discord.</p>
        <ul className="mt-4 space-y-3">
          {NOT_YET.map((item) => (
            <li key={item.name} className="text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="block text-muted">{item.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
