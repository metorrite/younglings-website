"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setFavoritesAction } from "@/app/dashboard/[guildId]/favorites-actions";
import { Icon } from "./icons";
import { LinkPending } from "./LinkPending";
import { QuickJump } from "./QuickJump";
import { favoriteItems, groupsFor, isActive, type NavItem } from "./nav";

export interface SidebarServer {
  id: string;
  name: string;
  iconUrl: string | null;
  /** What this person is to the server, shown under its name. */
  role: string;
}

function ServerIcon({ server, size }: { server: SidebarServer; size: number }) {
  if (!server.iconUrl) {
    return (
      <span aria-hidden="true" style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-muted">
        {server.name.charAt(0).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- a server icon from Discord's CDN
  return <img src={`${server.iconUrl}?size=96`} alt="" width={size} height={size} className="shrink-0 rounded-full" />;
}

/**
 * One server's navigation. On a wide screen it is a column down the left edge of the screen, as tall as the page, whose contents stay in
 * view while the page scrolls; on a narrow one it becomes a row of buttons above the page, so the pages themselves can use the whole width.
 */
export function Sidebar({
  server,
  footer,
  hasClan = true,
  base: where,
  favorites = [],
  canStar = true,
}: {
  server: SidebarServer;
  footer?: string;
  hasClan?: boolean;
  base?: string;
  /** The pages this person starred, in order. */
  favorites?: string[];
  /** False where there is nothing to save the stars to (the preview). */
  canStar?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = where ?? `/dashboard/${server.id}`;
  const groups = groupsFor(hasClan);
  const [starred, setStarred] = useState<string[]>(favorites);
  const [, start] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
  const starredItems = favoriteItems(starred, hasClan);

  /** Stars or unstars a page: it moves at once, then is saved; if the save fails it moves back and says so. */
  function toggleStar(item: NavItem) {
    if (!item.path) return;
    const before = starred;
    const next = before.includes(item.path) ? before.filter((p) => p !== item.path) : [...before, item.path];
    setStarred(next);
    setFailed(null);
    if (!canStar) return;
    start(async () => {
      const result = await setFavoritesAction(server.id, next);
      if (!result.ok) {
        setStarred(before);
        setFailed(result.error);
        return;
      }
      router.refresh();
    });
  }

  const star = (item: NavItem) => {
    const on = item.path !== undefined && starred.includes(item.path);
    return (
      <button
        type="button"
        onClick={() => toggleStar(item)}
        aria-pressed={on}
        aria-label={on ? `Unstar ${item.label}` : `Star ${item.label}`}
        title={on ? "Remove from your starred pages" : "Star this page: it moves to the top and into the Overview's quick links"}
        className={`shrink-0 rounded p-1 text-sm leading-none transition ${on ? "text-gold" : "text-muted/0 group-hover/item:text-muted/70 focus-visible:text-muted/70"} hover:text-gold`}
      >
        {on ? "★" : "☆"}
      </button>
    );
  };

  return (
    <aside aria-label="Server navigation" className="border-b border-surface-border bg-surface/60 lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:flex-col lg:overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-surface-border p-4">
          <ServerIcon server={server} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{server.name}</p>
            <p className="text-xs text-muted">{server.role}</p>
          </div>
          <Link href="/dashboard" title="Switch server" aria-label="Switch server" className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-gold">
            <Icon name="swap" />
          </Link>
        </div>

        <div className="hidden px-3 pt-3 lg:block">
          <QuickJump base={base} hasClan={hasClan} />
        </div>

        {/* wide screens: the full list */}
        <nav className="hidden flex-1 space-y-5 p-3 lg:block">
          {groups.map((group) => (
            <div key={group.title ?? "top"}>
              {group.title && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">{group.title}</p>}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item, base, pathname);
                  const body = (
                    <>
                      <Icon name={item.icon} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.soon && <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">Soon</span>}
                      {!item.soon && item.path !== undefined && <LinkPending />}
                    </>
                  );
                  return (
                    <li key={item.label} className="group/item flex items-center gap-1">
                      {item.soon || item.path === undefined ? (
                        <span aria-disabled="true" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted/60">
                          {body}
                        </span>
                      ) : (
                        <Link
                          href={`${base}${item.path}`}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition ${
                            active ? "border-gold bg-gold/10 font-medium text-foreground [&_svg]:text-gold" : "border-transparent text-muted hover:bg-white/5 hover:text-foreground"
                          }`}
                        >
                          {body}
                        </Link>
                      )}
                      {!item.soon && item.path !== undefined && item.path !== "" && star(item)}
                    </li>
                  );
                })}
              </ul>
              {/* right under the Overview: the pages this person starred */}
              {group.title === null && starredItems.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-gold/80 uppercase">★ Starred</p>
                  <ul className="space-y-0.5">
                    {starredItems.map((item) => {
                      const active = isActive(item, base, pathname);
                      return (
                        <li key={item.path} className="group/item flex items-center gap-1">
                          <Link
                            href={`${base}${item.path}`}
                            aria-current={active ? "page" : undefined}
                            className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition ${
                              active ? "border-gold bg-gold/10 font-medium text-foreground [&_svg]:text-gold" : "border-transparent text-muted hover:bg-white/5 hover:text-foreground"
                            }`}
                          >
                            <Icon name={item.icon} />
                            <span className="flex-1 truncate">{item.label}</span>
                            <LinkPending />
                          </Link>
                          {star(item)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {group.title === null && failed && <p className="mt-2 px-3 text-xs text-red-300">{failed}</p>}
            </div>
          ))}
        </nav>
        {footer && <p className="hidden border-t border-surface-border p-4 text-[11px] leading-relaxed text-muted lg:block">{footer}</p>}

        {/* narrow screens: one row, scrolled sideways */}
        <nav className="flex gap-1.5 overflow-x-auto p-2 lg:hidden">
          {groups.flatMap((group) => group.items)
            .filter((item) => !item.soon && item.path !== undefined)
            .map((item) => {
              const active = isActive(item, base, pathname);
              return (
                <Link
                  key={item.label}
                  href={`${base}${item.path}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition ${active ? "bg-gold/10 text-foreground [&_svg]:text-gold" : "text-muted hover:bg-white/5"}`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                  <LinkPending />
                </Link>
              );
            })}
        </nav>
      </div>
    </aside>
  );
}
