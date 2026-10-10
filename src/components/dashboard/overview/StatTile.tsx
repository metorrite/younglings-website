import Link from "next/link";

type Tone = "gold" | "good" | "bad" | "plain";

const TONE: Record<Tone, string> = {
  gold: "text-gold",
  good: "text-emerald-300",
  bad: "text-red-400",
  plain: "text-foreground",
};

/** One number from the bot at a glance. With an `href` the whole tile is a link to where it is dealt with. */
export function StatTile({ label, value, hint, tone = "gold", href }: { label: string; value: string | number; hint?: string; tone?: Tone; href?: string }) {
  const body = (
    <>
      <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONE[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const className = "block rounded-lg border border-surface-border bg-surface p-4";
  return href ? (
    <Link href={href} className={`${className} transition hover:border-gold`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
