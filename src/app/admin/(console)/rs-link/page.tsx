import { RsLinkAbuseView } from "@/components/admin/RsLinkAbuseView";
import { Card, Notice, StatusBadge, formatUtc } from "@/components/admin/ui";
import { requireOwner } from "@/lib/admin";
import { EVENT_LABELS, SUBJECT_LABELS, rsnLinkAdmin } from "@/lib/rsnLinkAdmin";
import { XP_CHECK } from "@/lib/rslink/verify";

export const metadata = { title: "RS Link abuse — Admin — Younglings" };
export const dynamic = "force-dynamic";

/**
 * The owner's view of the RS Link service (T-118): what is being tried, who keeps getting locked out, the DM limit, blocks, names claimed
 * twice, and finding or removing a link. Owner only; the bot checks that too. Nothing here shows a code, token or IP: subjects are short
 * fingerprints, and a Discord account is shown only when asked for one link.
 */
export default async function RsLinkAbusePage() {
  const admin = await requireOwner("/admin/rs-link");
  const [overview, events, offenders, blocks, disputes, audit] = await Promise.all([
    rsnLinkAdmin.overview(admin),
    rsnLinkAdmin.events(admin),
    rsnLinkAdmin.offenders(admin),
    rsnLinkAdmin.blocks(admin),
    rsnLinkAdmin.disputes(admin),
    rsnLinkAdmin.audit(admin),
  ]);

  const header = (
    <div>
      <h1 className="text-2xl font-semibold">RS Link abuse</h1>
      <p className="mt-1 text-sm text-muted">
        The RS Link service across every player. People and addresses appear as short fingerprints (like <code>3fa2c1d0</code>), so you can see the same one coming back without
        seeing who it is.
      </p>
    </div>
  );

  if (!overview.ok) {
    return (
      <div className="space-y-6">
        {header}
        <Notice tone="error" title={overview.status === 503 ? "The RS Link service is off" : "Couldn't load the RS Link service"} items={[overview.error]} />
      </div>
    );
  }
  const o = overview.data;
  const xp = o.verify?.[XP_CHECK];
  const kinds = Object.entries(o.events).sort((a, b) => b[1].day - a[1].day || b[1].week - a[1].week);

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active links" value={o.activeLinks} />
        <Stat label="Open disputes" value={o.openDisputes} warn={o.openDisputes > 0} />
        <Stat label="Active blocks" value={o.activeBlocks} />
        <Stat label="Pairings waiting" value={o.pendingPairings} />
      </div>

      <Card title="DM codes" hint="The DM fallback sends at most this many codes an hour across every player, so Discord never flags JonnyBot.">
        <p className="text-sm">
          {o.dmsLastHour} of {o.dmHourlyCap} sent in the last hour{" "}
          {o.dmBreakerOpen ? <StatusBadge tone="warn">Limit reached: new DM requests are not sent</StatusBadge> : <StatusBadge tone="good">Sending normally</StatusBadge>}
        </p>
      </Card>

      <Card
        title="Link verification"
        hint="The “plugin knew it first” check: RS Link reports a player's exact XP before the Hiscores show it; when the Hiscores later match, the link is confirmed and wins any dispute over the name. Switched on with LINK_VERIFY_ENABLED on the bot."
      >
        {!xp ? (
          <p className="text-sm">
            <StatusBadge tone="muted">Off</StatusBadge> <span className="text-muted">Every link stays “implicit”. {o.verifiedLinks ? `${o.verifiedLinks} link(s) were confirmed earlier.` : ""}</span>
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <p>
              <StatusBadge tone="good">On</StatusBadge>{" "}
              <span className="text-muted">
                {o.verifiedLinks ?? 0} confirmed link(s). Needs {xp.minMatches} matches of at least {xp.minGainXp} XP; at most {xp.checksPerMinute} checks a minute and{" "}
                {xp.checksPerLinkPerDay} per link a day.
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Watching" value={xp.totals.watches ?? 0} />
              <Stat label="Checks due now" value={xp.totals.watchesDue ?? 0} />
              <Stat label="Waiting for the Hiscores" value={xp.totals.claims_pending ?? 0} />
              <Stat label="Matches" value={xp.totals.claims_match ?? 0} />
              <Stat label="Misses" value={xp.totals.claims_miss ?? 0} warn={(xp.totals.claims_miss ?? 0) > (xp.totals.claims_match ?? 0) * 2} />
              <Stat label="Refused (already public)" value={xp.totals.claims_refused_public ?? 0} warn={(xp.totals.claims_refused_public ?? 0) > 0} />
              <Stat label="Over a daily budget" value={xp.budgetRefusals} />
              <Stat label="Failed reads" value={xp.failedReads} warn={xp.failedReads > 0} />
            </div>
            <p className="text-xs text-muted">
              Many “already public” values from one link mean someone is copying the Hiscores rather than playing. Budget and failed-read counts reset when the bot restarts.
            </p>
            {xp.recent.length > 0 && (
              <ul className="divide-y divide-white/10">
                {xp.recent.map((r) => (
                  <li key={r.linkId} className="flex flex-wrap gap-3 py-1.5">
                    <code>{r.linkId.slice(0, 8)}</code>
                    <span>
                      {r.matches} matches, {r.misses} misses
                    </span>
                    <span className="text-muted">confirmed {formatUtc(r.corroboratedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card title="What is being tried" hint="Abuse events by kind, in the last 24 hours and 7 days. They are kept for 30 days.">
        {kinds.length === 0 ? (
          <p className="text-sm text-muted">Nothing in the last 7 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 font-normal">Kind</th>
                <th className="py-1 text-right font-normal">24 h</th>
                <th className="py-1 text-right font-normal">7 days</th>
              </tr>
            </thead>
            <tbody>
              {kinds.map(([kind, n]) => (
                <tr key={kind} className="border-t border-white/10">
                  <td className="py-1.5">{EVENT_LABELS[kind] ?? kind}</td>
                  <td className="py-1.5 text-right tabular-nums">{n.day}</td>
                  <td className="py-1.5 text-right tabular-nums">{n.week}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title="Repeat offenders"
        hint={`Locked out in the last 24 hours. ${offenders.ok ? offenders.data.lockoutsBeforeBlock : 3} lockouts in a day block them automatically for 24 hours.`}
      >
        {!offenders.ok ? (
          <Notice tone="error" title="Couldn't load" items={[offenders.error]} />
        ) : offenders.data.offenders.length === 0 ? (
          <p className="text-sm text-muted">Nobody.</p>
        ) : (
          <ul className="divide-y divide-white/10 text-sm">
            {offenders.data.offenders.map((x) => (
              <li key={`${x.subjectKind}-${x.subject}`} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-24 text-muted">{SUBJECT_LABELS[x.subjectKind] ?? x.subjectKind}</span>
                <code>{x.subject}</code>
                <span>{x.lockouts} lockouts</span>
                <span className="text-muted">last {formatUtc(x.lastAt)}</span>
                {x.blocked && <StatusBadge tone="warn">Blocked</StatusBadge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RsLinkAbuseView
        initialBlocks={blocks.ok ? blocks.data.blocks : []}
        initialDisputes={disputes.ok ? disputes.data.disputes : []}
        loadProblems={[blocks, disputes].filter((r) => !r.ok).map((r) => (r.ok ? "" : r.error))}
      />

      <Card title="Latest events" hint="The 100 most recent. Codes, tokens and addresses are never recorded.">
        {!events.ok ? (
          <Notice tone="error" title="Couldn't load" items={[events.error]} />
        ) : events.data.events.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 text-sm">
            {events.data.events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex flex-wrap gap-3 py-1.5">
                <span className="w-40 text-muted">{formatUtc(e.at)}</span>
                <span className="flex-1">{EVENT_LABELS[e.kind] ?? e.kind}</span>
                <span className="text-muted">{SUBJECT_LABELS[e.subjectKind] ?? e.subjectKind}</span>
                {e.subject && <code>{e.subject}</code>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="What you did here" hint="Every block, unblock, settled dispute, removed link and revealed Discord account.">
        {!audit.ok ? (
          <Notice tone="error" title="Couldn't load" items={[audit.error]} />
        ) : audit.data.audit.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 text-sm">
            {audit.data.audit.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex flex-wrap gap-3 py-1.5">
                <span className="w-40 text-muted">{formatUtc(a.at)}</span>
                <span>{a.action.replace(/_/g, " ")}</span>
                <span className="text-muted">{a.target}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? "text-amber-300" : ""}`}>{value}</div>
    </div>
  );
}
