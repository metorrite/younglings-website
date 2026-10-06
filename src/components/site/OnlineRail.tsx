import Image from "next/image";
import Link from "next/link";
import { discordColor, getOnline } from "@/lib/site";
import { DiscordLink } from "./DiscordLink";
import { Unavailable } from "./blocks";

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  dnd: "bg-red-500",
};

/**
 * The live "Who's Online" rail: members grouped under their highest displayed role, in the same order as
 * Discord's own member list (role position, then alphabetical), tall enough to scroll through everyone.
 */
export async function OnlineRail() {
  const online = await getOnline();

  return (
    <aside className="flex max-h-[calc(100vh-7rem)] min-h-[32rem] flex-col rounded-xl border border-surface-border bg-surface/90 lg:sticky lg:top-6">
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-gold uppercase">Who&apos;s Online</h2>
        {online && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {online.total}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {online === null ? (
          <Unavailable what="The online list" />
        ) : online.groups.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">Nobody&apos;s online right now.</p>
        ) : (
          online.groups.map((group) => (
            <section key={group.name} className="mb-4">
              <h3 className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase" style={{ color: discordColor(group.colorRaw) ?? "var(--muted)" }}>
                {group.name} — {group.count}
              </h3>
              <ul>
                {group.members.map((member) => (
                  <li key={member.id} className="group/row flex items-center gap-1 rounded-md pr-1 hover:bg-white/5">
                    {/* The whole row opens their clan profile when they have one, and their Discord profile when they don't. */}
                    {(() => {
                      const row = (
                        <>
                          <span className="relative shrink-0">
                            <Image src={member.avatarUrl} alt="" width={30} height={30} className="rounded-full" />
                            <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${STATUS_DOT[member.status] ?? "bg-neutral-500"}`} />
                          </span>
                          <span className="truncate text-sm font-medium" style={{ color: discordColor(member.colorRaw) }}>
                            {member.displayName}
                          </span>
                        </>
                      );
                      const classes = "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5";
                      return member.rsn ? (
                        <Link href={`/members/${encodeURIComponent(member.rsn)}`} className={classes} title={`View ${member.rsn}'s clan profile`}>
                          {row}
                        </Link>
                      ) : (
                        <DiscordLink path={`users/${member.id}`} className={classes} title="Open their Discord profile">
                          {row}
                        </DiscordLink>
                      );
                    })()}
                    {member.rsn && (
                      <DiscordLink path={`users/${member.id}`} className="shrink-0 rounded px-1.5 py-0.5 text-xs text-muted opacity-0 transition group-hover/row:opacity-100 hover:text-foreground focus:opacity-100" title="Open their Discord profile">
                        ↗
                      </DiscordLink>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
