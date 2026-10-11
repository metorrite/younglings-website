"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { isActive, NAV_GROUPS } from "./nav";

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
 * One server's navigation. On a wide screen it is a panel down the left that stays in view while the page scrolls; on a narrow one it
 * becomes a row of buttons above the page, so the pages themselves can use the whole width.
 */
export function Sidebar({ server, base: where }: { server: SidebarServer; base?: string }) {
  const pathname = usePathname();
  const base = where ?? `/dashboard/${server.id}`;

  return (
    <aside aria-label="Server navigation" className="lg:sticky lg:top-20 lg:self-start">
      <div className="rounded-xl border border-surface-border bg-surface">
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

        {/* wide screens: the full list */}
        <nav className="hidden space-y-5 p-3 lg:block">
          {NAV_GROUPS.map((group) => (
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
                    </>
                  );
                  return (
                    <li key={item.label}>
                      {item.soon || item.path === undefined ? (
                        <span aria-disabled="true" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted/60">
                          {body}
                        </span>
                      ) : (
                        <Link
                          href={`${base}${item.path}`}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition ${
                            active ? "border-gold bg-gold/10 font-medium text-foreground [&_svg]:text-gold" : "border-transparent text-muted hover:bg-white/5 hover:text-foreground"
                          }`}
                        >
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* narrow screens: one row, scrolled sideways */}
        <nav className="flex gap-1.5 overflow-x-auto p-2 lg:hidden">
          {NAV_GROUPS.flatMap((group) => group.items)
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
                </Link>
              );
            })}
        </nav>
      </div>
    </aside>
  );
}
