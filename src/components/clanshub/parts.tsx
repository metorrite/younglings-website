import Link from "next/link";
import { LocalTime } from "@/components/site/LocalTime";
import { accent, type ClanSummary, type HubEvent } from "@/lib/clansHub";
import { hubHref, type SiteInfo } from "@/lib/siteHosts";

/** A clan's logo, or its first letter on its accent colour when it has none. */
export function ClanMark({ clan, size = 48 }: { clan: { name: string; logoUrl: string | null; colour: number | null }; size?: number }) {
  const colour = accent(clan.colour);
  return clan.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={clan.logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-full border border-surface-border object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-black"
      style={{ width: size, height: size, backgroundColor: colour, fontSize: size * 0.42 }}
    >
      {clan.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const RECRUIT_TONE: Record<string, string> = {
  OPEN: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  INVITE_ONLY: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  CLOSED: "border-surface-border bg-white/5 text-muted",
};

export function RecruitingBadge({ clan }: { clan: Pick<ClanSummary, "recruiting"> }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${RECRUIT_TONE[clan.recruiting.key] ?? RECRUIT_TONE.CLOSED}`}>{clan.recruiting.label}</span>;
}

export function FocusChips({ focus }: { focus: ClanSummary["focus"] }) {
  if (focus.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {focus.map((f) => (
        <li key={f.key} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-muted">
          {f.label}
        </li>
      ))}
    </ul>
  );
}

export function VerifiedTick({ clan }: { clan: Pick<ClanSummary, "verified" | "clanName"> }) {
  if (!clan.verified) return null;
  return (
    <span title={`Ownership of ${clan.clanName ?? "this clan"} was checked against the in-game clan`} className="inline-flex items-center gap-1 text-xs text-gold">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

export function ClanCard({ clan, site }: { clan: ClanSummary; site: SiteInfo }) {
  return (
    <li>
      <Link
        href={hubHref(site, `/c/${clan.slug}`)}
        className="group flex h-full flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5 transition hover:border-gold/60"
        style={{ borderTop: `3px solid ${accent(clan.colour)}` }}
      >
        <div className="flex items-center gap-3">
          <ClanMark clan={clan} />
          <div className="min-w-0">
            <p className="truncate font-semibold group-hover:text-gold">{clan.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <RecruitingBadge clan={clan} />
              <VerifiedTick clan={clan} />
            </div>
          </div>
        </div>
        {clan.tagline && <p className="line-clamp-2 break-words text-sm text-muted">{clan.tagline}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <FocusChips focus={clan.focus.slice(0, 3)} />
          {clan.memberCount !== null && <span className="text-xs text-muted tabular-nums">{clan.memberCount} members</span>}
        </div>
      </Link>
    </li>
  );
}

export function EventRow({ event, site }: { event: HubEvent; site: SiteInfo }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {event.clan && <ClanMark clan={event.clan} size={36} />}
        <div className="min-w-0">
          <a href={event.url} target="_blank" rel="noreferrer noopener" className="font-medium break-words hover:text-gold hover:underline">
            {event.name}
          </a>
          <p className="text-sm text-muted">
            {event.clan && (
              <>
                <Link href={hubHref(site, `/c/${event.clan.slug}`)} className="hover:text-foreground hover:underline">
                  {event.clan.name}
                </Link>
                {" · "}
              </>
            )}
            <LocalTime iso={event.startTime} />
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
        {event.status === "ACTIVE" && <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Happening now</span>}
        {event.interestedCount > 0 && <span className="tabular-nums">{event.interestedCount} interested</span>}
      </span>
    </li>
  );
}

export function Unavailable() {
  return <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">The clan directory is temporarily unavailable. Try again in a moment.</p>;
}
