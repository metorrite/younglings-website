import Link from "next/link";
import type { ReactNode } from "react";
import { LocalDateTile } from "@/components/clanshub/LocalDateTile";
import { LocalTime } from "@/components/site/LocalTime";
import { clanAccent, withAlpha, type ClanSummary, type HubEvent } from "@/lib/clansHub";
import { hubHref, type SiteInfo } from "@/lib/siteHosts";

type Markable = { name: string; slug?: string; logoUrl: string | null; colour: number | null };

/** A clan's logo, or its first letter on its own colour when it has none, with a soft glow in that colour. */
export function ClanMark({ clan, size = 48, ring = false }: { clan: Markable; size?: number; ring?: boolean }) {
  const colour = clanAccent(clan);
  const glow = { boxShadow: `0 0 ${Math.round(size / 2)}px ${withAlpha(colour, 0.35)}` };
  return clan.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={clan.logoUrl}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-2xl object-cover ${ring ? "ring-4 ring-surface" : "border border-surface-border"}`}
      style={{ width: size, height: size, ...glow }}
    />
  ) : (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-2xl font-semibold text-black ${ring ? "ring-4 ring-surface" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, ${colour}, ${withAlpha(colour, 0.7)})`, ...glow }}
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
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${RECRUIT_TONE[clan.recruiting.key] ?? RECRUIT_TONE.CLOSED}`}>
      {clan.recruiting.key === "OPEN" && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      {clan.recruiting.label}
    </span>
  );
}

export function FocusChips({ focus, accent }: { focus: ClanSummary["focus"]; accent?: string }) {
  if (focus.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {focus.map((f) => (
        <li key={f.key} className="rounded-md px-2 py-0.5 text-xs text-foreground/80" style={{ backgroundColor: accent ? withAlpha(accent, 0.14) : "rgba(255,255,255,0.06)" }}>
          {f.label}
        </li>
      ))}
    </ul>
  );
}

export function VerifiedTick({ clan }: { clan: Pick<ClanSummary, "verified" | "clanName"> }) {
  if (!clan.verified) return null;
  return (
    <span title={`Ownership of ${clan.clanName ?? "this clan"} was checked against the in-game clan`} className="inline-flex items-center gap-1 text-xs font-medium text-gold">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

/** A big number with its label, for the strip beside the hero and the side of a clan page. */
export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface/70 px-4 py-3" style={accent ? { borderTop: `2px solid ${accent}` } : undefined}>
      <p className="text-xs font-medium tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A section title with an optional "see all" link, the same on every hub page. */
export function SectionHeader({ title, hint, href, hrefLabel }: { title: string; hint?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-medium text-gold hover:underline">
          {hrefLabel ?? "See all"} →
        </Link>
      )}
    </div>
  );
}

/** A clan in the directory: a banner in its own colour, its logo overlapping it, what it is, who it wants and how big it is. */
export function ClanCard({ clan, site }: { clan: ClanSummary; site: SiteInfo }) {
  const colour = clanAccent(clan);
  return (
    <li>
      <Link
        href={hubHref(site, `/c/${clan.slug}`)}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
        style={{ ["--accent" as string]: colour }}
      >
        <div className="relative h-20" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${withAlpha(colour, 0.5)}, transparent 60%), linear-gradient(135deg, ${withAlpha(colour, 0.22)}, ${withAlpha(colour, 0.04)})` }}>
          <span className="absolute top-3 right-3">
            <RecruitingBadge clan={clan} />
          </span>
        </div>
        <div className="-mt-9 px-5">
          <ClanMark clan={clan} size={64} ring />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5 pt-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold transition-colors group-hover:text-[var(--accent)]">{clan.name}</p>
            <VerifiedTick clan={clan} />
          </div>
          {clan.tagline && <p className="line-clamp-2 text-sm break-words text-muted">{clan.tagline}</p>}
          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <FocusChips focus={clan.focus.slice(0, 3)} accent={colour} />
            {clan.memberCount !== null && (
              <span className="shrink-0 text-right text-xs text-muted tabular-nums">
                <span className="block text-base font-semibold text-foreground">{clan.memberCount}</span>
                members
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/** A public event: a date tile in its clan's colour, what it is, who runs it and when. */
export function EventCard({ event, site }: { event: HubEvent; site: SiteInfo }) {
  const colour = event.clan ? clanAccent(event.clan) : "#d4af37";
  return (
    <li className="flex items-start gap-4 rounded-2xl border border-surface-border bg-surface p-4 transition hover:border-white/20">
      <LocalDateTile iso={event.startTime} accent={colour} />
      <div className="min-w-0 flex-1">
        <a href={event.url} target="_blank" rel="noreferrer noopener" className="font-semibold break-words hover:underline" style={{ textDecorationColor: colour }}>
          {event.name}
        </a>
        <p className="mt-0.5 text-sm text-muted">
          {event.clan && (
            <>
              <Link href={hubHref(site, `/c/${event.clan.slug}`)} className="font-medium hover:text-foreground hover:underline">
                {event.clan.name}
              </Link>
              {" · "}
            </>
          )}
          <LocalTime iso={event.startTime} />
          {event.location ? ` · ${event.location}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {event.status === "ACTIVE" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Happening now
            </span>
          )}
          {event.interestedCount > 0 && <span className="text-muted tabular-nums">{event.interestedCount} interested</span>}
        </div>
      </div>
    </li>
  );
}

/** XP as 302.2M / 41.5K, so a ranking fits on a card. */
export function compact(n: number): string {
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function Unavailable() {
  return <p className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">The clan directory is temporarily unavailable. Try again in a moment.</p>;
}
