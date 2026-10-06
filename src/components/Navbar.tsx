import Image from "next/image";
import Link from "next/link";
import { getRoster } from "@/lib/site";
import { CommandPalette, type PaletteItem } from "./site/CommandPalette";
import { LoginButton } from "./LoginButton";

interface NavLink {
  href: string;
  label: string;
}

const GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "Clan",
    links: [
      { href: "/members", label: "Members" },
      { href: "/activity", label: "Activity" },
      { href: "/hall-of-fame", label: "Hall of Fame" },
      { href: "/history", label: "History" },
      { href: "/compare", label: "Compare" },
    ],
  },
  {
    label: "Stats",
    links: [
      { href: "/stats", label: "Overview" },
      { href: "/recap", label: "Recaps" },
      { href: "/leaderboards", label: "Leaderboards" },
      { href: "/citadel", label: "Citadel" },
      { href: "/pvm", label: "PvM & drops" },
      { href: "/coffer", label: "Coffer" },
    ],
  },
  {
    label: "Events",
    links: [
      { href: "/events", label: "Upcoming" },
      { href: "/events/calendar", label: "Calendar" },
      { href: "/signups", label: "Signups" },
      { href: "/polls", label: "Polls" },
    ],
  },
];

const ALL_LINKS: NavLink[] = [{ href: "/", label: "Home" }, ...GROUPS.flatMap((g) => g.links)];

export async function Navbar() {
  const roster = await getRoster();
  const palette: PaletteItem[] = [
    ...ALL_LINKS.map((l) => ({ label: l.label, href: l.href, hint: "Page" })),
    { label: "My profile & settings", href: "/profile", hint: "Page" },
    ...(roster?.members.map((m) => ({ label: m.rsn, href: `/members/${encodeURIComponent(m.rsn)}`, hint: m.rank })) ?? []),
  ];

  return (
    <header className="relative z-40 border-b border-surface-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/clan-logo.png" alt="Younglings" width={32} height={32} className="rounded-full" />
          <span className="font-semibold tracking-wide text-gold">YOUNGLINGS</span>
        </Link>

        {/* Wide screens: grouped menus that open on hover or keyboard focus. */}
        <nav className="hidden items-center gap-1 text-sm text-muted lg:flex">
          <Link href="/" className="rounded-md px-3 py-2 transition hover:text-foreground">
            Home
          </Link>
          {GROUPS.map((group) => (
            <div key={group.label} className="group relative">
              <button type="button" className="rounded-md px-3 py-2 transition group-hover:text-foreground group-focus-within:text-foreground">
                {group.label} <span className="text-[10px]">▾</span>
              </button>
              <div className="invisible absolute top-full left-0 min-w-44 pt-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <ul className="overflow-hidden rounded-lg border border-surface-border bg-surface py-1 shadow-xl">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="block px-4 py-2 transition hover:bg-white/5 hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <CommandPalette items={palette} />
          <LoginButton />
        </div>
      </div>

      {/* Narrower screens: every link in a row of its own that scrolls sideways if it has to. */}
      <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto border-t border-surface-border/60 px-4 py-2.5 text-sm text-muted sm:px-6 lg:hidden">
        {ALL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 transition hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
