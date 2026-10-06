import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { getAdminIfAny } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { getMemberInfo } from "@/lib/jonnybot";
import { ALL_NAV_LINKS } from "@/lib/nav";
import { displayName } from "@/lib/names";
import { getRoster } from "@/lib/site";
import { NavMenus } from "./nav/NavMenus";
import { NavSearch, type SearchItem } from "./nav/NavSearch";
import { ProfileMenu } from "./nav/ProfileMenu";
import { ResetTimer } from "./nav/ResetTimer";

/**
 * The site header. Left to right: the clan icon and name (home), a live countdown to the weekly game reset,
 * the page menus, search, and the signed-in person's menu (or the Discord login button).
 */
export async function Navbar() {
  const [roster, session] = await Promise.all([getRoster(), getServerSession(authOptions)]);

  let user: { name: string; image: string | null } | null = null;
  let isAdmin = false;
  if (session?.user?.id) {
    const [info, admin] = await Promise.all([getMemberInfo(session.user.id), getAdminIfAny()]);
    user = { name: displayName(info?.nickname, info?.username ?? session.user.name), image: session.user.image ?? info?.avatarUrl ?? null };
    isAdmin = admin !== null;
  }

  const items: SearchItem[] = [
    ...ALL_NAV_LINKS.map((l) => ({ label: l.label, href: l.href, hint: "Page" })),
    { label: "My profile & settings", href: "/profile", hint: "Page" },
    ...(roster?.members.map((m) => ({ label: m.rsn, href: `/members/${encodeURIComponent(m.rsn)}`, hint: m.rank })) ?? []),
  ];

  return (
    <header className="relative z-40 border-b border-surface-border bg-surface/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Younglings — home">
          <Image src="/clan-logo.png" alt="" width={32} height={32} className="rounded-full" />
          <span className="hidden font-semibold tracking-wide text-gold sm:inline">YOUNGLINGS</span>
        </Link>

        <ResetTimer />

        <nav className="hidden flex-1 justify-center lg:flex" aria-label="Main">
          <NavMenus />
        </nav>
        <div className="flex-1 lg:hidden" />

        <NavSearch items={items} />
        <ProfileMenu user={user} isAdmin={isAdmin} />
      </div>

      {/* Narrower screens: every link in a row of its own that scrolls sideways if it has to. */}
      <nav className="flex gap-5 overflow-x-auto border-t border-surface-border/60 px-4 py-2.5 text-sm text-muted sm:px-6 lg:hidden" aria-label="Main (compact)">
        {ALL_NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 transition hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
