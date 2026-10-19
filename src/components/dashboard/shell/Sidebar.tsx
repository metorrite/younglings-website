"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { setFavoritesAction } from "@/app/dashboard/[guildId]/favorites-actions";
import { Icon } from "./icons";
import { LinkPending } from "./LinkPending";
import { QuickJump } from "./QuickJump";
import { useViewMode, ViewModeSlider } from "@/components/dashboard/ui/ViewMode";
import { favoriteItems, groupsFor, isActive, visibleGroups, type NavItem } from "./nav";

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

const FOLDED_KEY = "jonnybot-nav-folded";
const FOLDED_EVENT = "jonnybot-nav-folded-changed";

function subscribeFolded(notify: () => void) {
  window.addEventListener(FOLDED_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(FOLDED_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

/** The titles of the groups this person folded away in the sidebar, remembered in this browser. */
function useFoldedGroups(): [string[], (title: string) => void] {
  const raw = useSyncExternalStore(
    subscribeFolded,
    () => {
      try {
        return window.localStorage.getItem(FOLDED_KEY) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  let folded: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) folded = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // a damaged value just means nothing is folded
  }
  const toggle = (title: string) => {
    // read what is stored right now, so two quick clicks never undo each other
    let current = folded;
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(FOLDED_KEY) ?? "[]");
      if (Array.isArray(stored)) current = stored.filter((x): x is string => typeof x === "string");
    } catch {
      // keep what this render knew
    }
    const next = current.includes(title) ? current.filter((x) => x !== title) : [...current, title];
    try {
      window.localStorage.setItem(FOLDED_KEY, JSON.stringify(next));
    } catch {
      // not remembered across visits
    }
    window.dispatchEvent(new Event(FOLDED_EVENT));
  };
  return [folded, toggle];
}

/**
 * One server's navigation. On a wide screen it is a column down the left edge of the screen, as tall as the page, whose contents stay in
 * view while the page scrolls; on a narrow one it becomes a row of buttons above the page, so the pages themselves can use the whole width.
 */
export function Sidebar({
  server,
  footer,
  hasClan = true,
  isOwner = false,
  base: where,
  favorites = [],
  canStar = true,
}: {
  server: SidebarServer;
  footer?: string;
  hasClan?: boolean;
  /** Whether this person owns the bot itself, which adds the owner-only pages. */
  isOwner?: boolean;
  base?: string;
  /** The pages this person starred, in order. */
  favorites?: string[];
  /** False where there is nothing to save the stars to (the preview). */
  canStar?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = where ?? `/dashboard/${server.id}`;
  const [view, setView] = useViewMode();
  const [folded, toggleFolded] = useFoldedGroups();
  const [starred, setStarred] = useState<string[]>(favorites);
  const [, start] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
  const starredItems = favoriteItems(starred, hasClan);
  // the Basic view leaves out the pages most servers never open, except the one being looked at and the ones this person starred
  const { groups, hidden } = visibleGroups(groupsFor(hasClan, isOwner), view === "advanced", (item) => isActive(item, base, pathname) || (item.path !== undefined && starred.includes(item.path)));

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
        <div className="space-y-3 border-b border-surface-border p-4">
          <div className="flex items-center gap-3">
            <ServerIcon server={server} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{server.name}</p>
              <p className="text-xs text-muted">{server.role}</p>
            </div>
            <Link href="/dashboard" title="Switch server" aria-label="Switch server" className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-gold">
              <Icon name="swap" />
            </Link>
          </div>
          <ViewModeSlider />
        </div>

        <div className="hidden px-3 pt-3 lg:block">
          <QuickJump base={base} hasClan={hasClan} isOwner={isOwner} />
        </div>

        {/* wide screens: the full list */}
        <nav className="hidden flex-1 space-y-5 p-3 lg:block">
          {groups.map((group) => {
            // a group can be folded away to shorten the list, but never the one holding the page being looked at
            const holdsActive = group.items.some((item) => isActive(item, base, pathname));
            const closed = group.title !== null && folded.includes(group.title) && !holdsActive;
            return (
            <div key={group.title ?? "top"}>
              {group.title && (
                <button
                  type="button"
                  aria-expanded={!closed}
                  onClick={() => toggleFolded(group.title as string)}
                  className="mb-1.5 flex w-full items-center gap-1.5 rounded px-3 text-left text-[11px] font-semibold tracking-wider text-muted/80 uppercase transition hover:text-foreground"
                >
                  <span aria-hidden className={`text-[9px] transition-transform ${closed ? "" : "rotate-90"}`}>
                    ▶
                  </span>
                  {group.title}
                  {closed && <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tracking-normal normal-case">{group.items.length}</span>}
                </button>
              )}
              <ul className="space-y-0.5" hidden={closed}>
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
            );
          })}
          {hidden > 0 && (
            <button type="button" onClick={() => setView("advanced")} className="w-full rounded-md px-3 py-2 text-left text-xs text-muted transition hover:bg-white/5 hover:text-foreground">
              + {hidden} more {hidden === 1 ? "page" : "pages"} in the Advanced view
            </button>
          )}
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
