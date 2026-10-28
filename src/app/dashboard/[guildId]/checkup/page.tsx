import Link from "next/link";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { requireGuild } from "@/lib/dashboard";
import { adminApi, type CheckupFinding } from "@/lib/jonnybot-admin";

export const dynamic = "force-dynamic";

const LOOK: Record<CheckupFinding["level"], { icon: string; ring: string; label: string }> = {
  ERROR: { icon: "✕", ring: "bg-red-500/15 text-red-300", label: "Needs fixing" },
  WARN: { icon: "!", ring: "bg-amber-500/15 text-amber-300", label: "Worth a look" },
  OK: { icon: "✓", ring: "bg-emerald-500/15 text-emerald-300", label: "Fine" },
};

export default async function CheckupPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const result = await adminApi.checkup(guild);
  const base = `/dashboard/${guildId}`;

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Checkup" description="Looks over this server's setup for permission and role problems before they cause trouble." />
        <p className="rounded-xl border border-surface-border bg-surface p-6 text-sm text-muted">
          The checkup isn&apos;t available right now ({result.status === 404 ? "this bot is older than the checkup" : result.error}). Try again in a moment.
        </p>
      </div>
    );
  }

  const { findings, errors, warnings, intents } = result.data;
  const problems = findings.filter((f) => f.level !== "OK");
  const fine = findings.filter((f) => f.level === "OK");
  const headline =
    findings.length === 0
      ? { tone: "border-surface-border bg-surface", text: "Nothing is set up yet, so there is nothing to check.", sub: "Once you choose channels and roles, come back and run this again." }
      : errors > 0
        ? { tone: "border-red-500/40 bg-red-500/10", text: `${errors} thing${errors === 1 ? "" : "s"} need${errors === 1 ? "s" : ""} fixing`, sub: warnings > 0 ? `and ${warnings} worth a look.` : "Fix these and JonnyBot can do its job here." }
        : warnings > 0
          ? { tone: "border-amber-500/40 bg-amber-500/10", text: `${warnings} thing${warnings === 1 ? " is" : "s are"} worth a look`, sub: "Nothing is broken, but these may not work the way you expect." }
          : { tone: "border-emerald-500/30 bg-emerald-500/5", text: "Everything checks out", sub: `${fine.length} thing${fine.length === 1 ? "" : "s"} checked, no problems found.` };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checkup"
        description="Looks over this server's setup for permission and role problems before they cause trouble: channels JonnyBot can't post in, roles it can't give out, features with nowhere to go."
        actions={
          <Link href={`${base}/checkup`} prefetch={false} className="rounded-md border border-surface-border px-4 py-2 text-sm transition hover:border-gold">
            Run again
          </Link>
        }
      />

      <div className={`rounded-xl border p-5 ${headline.tone}`}>
        <p className="font-semibold">{headline.text}</p>
        <p className="text-sm text-muted">{headline.sub}</p>
      </div>

      {problems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">To do</h2>
          <ul className="space-y-3">
            {problems.map((f, i) => (
              <li key={`${f.title}-${i}`} className="flex flex-wrap items-start gap-4 rounded-xl border border-surface-border bg-surface p-4">
                <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${LOOK[f.level].ring}`}>
                  {LOOK[f.level].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {f.title} <span className="sr-only">({LOOK[f.level].label})</span>
                  </p>
                  <p className="text-xs text-muted">{f.area}</p>
                  {f.detail && <p className="mt-1 text-sm text-muted">{f.detail}</p>}
                </div>
                {f.page && (
                  <Link href={`${base}/${f.page}`} className="shrink-0 rounded-md border border-surface-border px-3 py-1.5 text-sm transition hover:border-gold">
                    Go fix it →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {intents && (
        <CollapsibleCard
          id="checkup-intents"
          title="Discord permissions the bot runs with"
          hint="The three privileged switches in Discord's developer portal."
          summary={<Chip tone={intents.members && intents.presence && intents.messageContent ? "good" : "warn"}>{[intents.members, intents.presence, intents.messageContent].filter(Boolean).length} of 3 on</Chip>}
        >
          <ul className="space-y-2 text-sm">
            {[
              { on: intents.members, name: "Server Members", off: "Joins, leaves, autoroles and member tracking don't work." },
              { on: intents.messageContent, name: "Message Content", off: "Message logs, Highlights, automatic replies and word filters can't read messages." },
              { on: intents.presence, name: "Presence", off: "The clan website hides its Who's Online list." },
            ].map((i) => (
              <li key={i.name} className="flex items-start gap-3">
                <Chip tone={i.on ? "good" : "warn"}>{i.on ? "On" : "Off"}</Chip>
                <span>
                  {i.name}
                  {!i.on && <span className="block text-xs text-muted">{i.off}</span>}
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {fine.length > 0 && (
        <CollapsibleCard
          id="checkup-fine"
          title="Looking good"
          hint="What was checked and found fine."
          defaultOpen={problems.length === 0}
          summary={<Chip tone="good">{fine.length} fine</Chip>}
        >
          <ul className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))" }}>
            {fine.map((f, i) => (
              <li key={`${f.title}-${i}`} className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm">
                <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${LOOK.OK.ring}`}>
                  {LOOK.OK.icon}
                </span>
                <span className="min-w-0">
                  <span className="block">{f.title}</span>
                  {f.detail && <span className="block text-xs text-muted">{f.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}
    </div>
  );
}
