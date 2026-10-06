import Image from "next/image";
import Link from "next/link";
import { LoginButton } from "./LoginButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/members", label: "Members" },
  { href: "/events", label: "Events" },
  { href: "/stats", label: "Stats" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/coffer", label: "Coffer" },
  { href: "/compare", label: "Compare" },
];

export function Navbar() {
  const links = NAV_LINKS.map((link) => (
    <Link key={link.href} href={link.href} className="shrink-0 transition hover:text-foreground">
      {link.label}
    </Link>
  ));

  return (
    <header className="border-b border-surface-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/clan-logo.png" alt="Younglings" width={32} height={32} className="rounded-full" />
          <span className="font-semibold tracking-wide text-gold">YOUNGLINGS</span>
        </Link>

        {/* Wide screens: links sit between the logo and the login button. */}
        <nav className="hidden items-center gap-5 text-sm text-muted lg:flex">{links}</nav>

        <LoginButton />
      </div>

      {/* Narrower screens: the same links in a row of their own that scrolls sideways if it has to. */}
      <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto border-t border-surface-border/60 px-4 py-2.5 text-sm text-muted sm:px-6 lg:hidden">{links}</nav>
    </header>
  );
}
